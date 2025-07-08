import json

from datetime import datetime, timezone
from typing import Any, Callable, Generic, Optional, TypeVar, List, Awaitable
import asyncio

import aio_pika
from aio_pika.abc import (
    AbstractRobustConnection,
    AbstractRobustChannel,
)
from pydantic import BaseModel, ConfigDict, Field

from service_python_shared.configs.config import config
from service_python_shared.modules.logger import get_logger

T = TypeVar("T")

conn_info = config["rabbitmq"]["connection_settings"]
origin_queue_name = config["rabbitmq"]["service_queue_name"]
prefetch_limit = config["rabbitmq"]["prefetchLimit"]


class RabbitMqMessage(BaseModel, Generic[T]):
    from_: str = Field(alias="from")
    to: str
    time: str
    jobId: str
    errors: List[str]
    filepath: str
    md5: str
    message: T

    model_config = ConfigDict(populate_by_name=True)


class RabbitMqConnection:
    def __init__(self, queue_name: str, durable: bool = True):
        self.queue_name = queue_name
        self.durable = durable
        self.connection: Optional[AbstractRobustConnection] = None
        self.channel: Optional[AbstractRobustChannel] = None
        self._connect_lock = asyncio.Lock()
        self.connection_attempts = 0
        self.max_connection_attempts = 10
        self.wait_time_for_connection = 2  # seconds

    async def connect(self):
        logger = get_logger("RabbitMqConnection/connect")
        while self.connection_attempts < self.max_connection_attempts:
            async with self._connect_lock:
                if self.connection and self.channel:
                    return
                self.connection_attempts += 1
                logger.info(
                    f"Connecting to RabbitMQ at {conn_info['host']}:{conn_info['port']} for queue {self.queue_name}"
                )
                try:
                    self.connection = await aio_pika.connect_robust(**conn_info)
                    self.channel = await self.connection.channel()
                    await self.channel.set_qos(prefetch_count=prefetch_limit)
                    await self.channel.declare_queue(
                        self.queue_name, durable=self.durable
                    )
                    logger.info("RabbitMQ Connection Established")
                    self.connection_attempts = 0
                    return  # Exit once connected

                except Exception as e:
                    logger.warning(f"RabbitMQ connection failed: {e}")
                    if self.connection_attempts >= self.max_connection_attempts:
                        logger.error(
                            "Maximum connection attempts reached - aborting service."
                        )
                        raise
                    logger.info(
                        f"⏳ Retrying in {self.wait_time_for_connection:.2f} seconds..."
                    )
                    await asyncio.sleep(self.wait_time_for_connection)

    def is_connected(self) -> bool:
        return self.connection is not None and self.channel is not None

    async def close(self):
        logger = get_logger("RabbitMqConnection/close")
        logger.info(
            f"Closing RabbitMQ connection to {conn_info['host']}:{conn_info['port']} queue: {self.queue_name}"
        )
        if self.channel:
            await self.channel.close()
        if self.connection:
            await self.connection.close()
        self.channel = None
        self.connection = None


class RabbitMqConnectionManager:
    def __init__(self, queue_name: str, durable: bool = True):
        self.queue_name = queue_name
        self.connection = RabbitMqConnection(queue_name, durable)

    async def connect(self):
        if not self.connection.is_connected():
            await self.connection.connect()

    def get_queue_name(self) -> str:
        return self.queue_name

    def is_connected(self) -> bool:
        return self.connection.is_connected()

    async def close(self):
        await self.connection.close()


class RabbitMqMessageSender(RabbitMqConnectionManager):
    async def send_json_message(
        self,
        queue_name: str,
        message: T,
        filepath: str,
        md5: str,
        job_id: str = "",
        corr_id: str = "",
        jwe_token: str = "",
        errors: List[str] = [],
        persistent: bool = True,
    ):
        if not self.connection.is_connected():
            await self.connection.connect()

        message_to_send = RabbitMqMessage[T](
            from_=origin_queue_name,
            to=queue_name,
            filepath=filepath,
            md5=md5,
            jobId=job_id,
            time=datetime.now(timezone.utc).isoformat(),
            errors=errors,
            message=message,
        )

        json_bytes = json.dumps(message_to_send.model_dump(by_alias=True)).encode(
            "utf-8"
        )

        await self.connection.channel.default_exchange.publish(
            aio_pika.Message(
                body=json_bytes,
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
                if persistent
                else aio_pika.DeliveryMode.NOT_PERSISTENT,
                headers={
                    "x-correlation-id": corr_id,
                    "authorization": f"Bearer {jwe_token}",
                },
            ),
            routing_key=queue_name,
        )


class RabbitMqMessageReceiver(RabbitMqConnectionManager):
    def __init__(
        self, queue_name: str, durable: bool = True, auto_acknowledge: bool = False
    ):
        super().__init__(queue_name, durable)
        self.auto_acknowledge = auto_acknowledge

    async def get_messages_on_queue(
        self,
        callback: Callable[
            [RabbitMqMessage[Any], aio_pika.IncomingMessage], Awaitable[None]
        ],
    ):
        if not self.is_connected():
            await self.connection.connect()

        logger = get_logger("RabbitMqMessageReceiver/get_messages_on_queue")

        queue = await self.connection.channel.declare_queue(
            self.queue_name, durable=self.connection.durable
        )

        async def _consumer(message: aio_pika.IncomingMessage):
            logger.info(f"Message received on queue: {self.queue_name}")
            try:
                raw = message.body.decode("utf-8")
                parsed_message = RabbitMqMessage[Any].model_validate_json(raw)

                await callback(parsed_message, message)

                if self.auto_acknowledge:
                    await message.ack()
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                # Always ack even on error to avoid retry loops
                if not self.auto_acknowledge:
                    await message.ack()

        await queue.consume(_consumer, no_ack=False)

        # Keep the consumer alive
        logger.info("Waiting for messages...")
        try:
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logger.info("Consumer cancelled")
        except Exception as e:
            logger.error(f"Consumer crashed: {e}")
            raise
