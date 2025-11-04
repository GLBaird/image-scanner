from aio_pika import IncomingMessage
from aio_pika.exceptions import (
    ChannelClosed,
    ConnectionClosed,
    MessageProcessError,
)
import grpc
from typing import TypeVar, Callable
from cv2 import error as Cv2Error
from pydantic import ValidationError
from service_python_shared.modules.rabbitmq import (
    RabbitMqMessageSender,
    RabbitMqMessageReceiver,
    RabbitMqMessage,
)
from service_python_shared.modules.JobManagerClient import JobManagerClient
from service_python_shared.modules.logger import get_logger
from service_python_shared.configs.config import config
from service_python_shared.lib.utils import decode_header

JOB_MANAGER_QUEUE = config["rabbitmq"]["job_manager_queue_name"]
SERVICE_QUEUE = config["rabbitmq"]["service_queue_name"]

T = TypeVar("T")


class Workflow:
    def __init__(self, description: str, extract_data: Callable[[bytes], T]):
        self.sender = RabbitMqMessageSender(JOB_MANAGER_QUEUE)
        self.receiver = RabbitMqMessageReceiver(SERVICE_QUEUE)
        self.jobManagerClient = JobManagerClient()
        self.description = description
        self.extract_data = extract_data

    async def start_receiving_messages(self):
        logger = get_logger("Workflow/start_receiving_messages")
        logger.info("connecting to gRPC JobManager service...")
        await self.jobManagerClient.connect()
        logger.info("connecting to rabbitMq...")
        await self.sender.connect()
        await self.receiver.connect()
        self._keep_alive = self.receiver.get_messages_on_queue(
            self.handle_incoming_message
        )
        logger.info("rabbitMq and gRPC services connected")
        await self._keep_alive

    async def stop_processing(self):
        logger = get_logger("Workflow/stop_processing")
        logger.warning("closing service and killing all connections...")
        await self.receiver.close()
        await self.sender.close()
        await self.jobManagerClient.close_grpc_socket()
        self._keep_alive.set()
        logger.warning("service closed and processing stopped")

    async def handle_incoming_message(
        self, data: RabbitMqMessage, message: IncomingMessage
    ):
        job_id = data.jobId
        filepath = data.filepath
        md5 = data.md5
        headers = message.headers or {}
        corr_id = decode_header(headers.get("x-correlation-id"))
        jwe_token = decode_header(headers.get("authorization"))

        logger = get_logger("Workflow/handle_incoming_message", corr_id=corr_id)
        logger.info(f"handling incoming message from {data.from_} for image {filepath}")
        if corr_id is None or jwe_token is None:
            await self.reject_message(
                reason="bad request, no credentials provided",
                data=data,
                message=message,
                corr_id=corr_id,
                jwe_token=jwe_token,
            )
            return
        acked = False
        try:
            extracted_data = await self.process_image(filepath, corr_id, jwe_token)
            await self.sender.send_json_message(
                queue_name=JOB_MANAGER_QUEUE,
                message=extracted_data,
                filepath=filepath,
                md5=md5,
                job_id=job_id,
                corr_id=corr_id,
                jwe_token=jwe_token,
                errors=[],
            )
            await message.ack()
            acked = True
            logger.info(f"completed processing image {filepath} for job: {job_id}")
            return
        except grpc.RpcError as e:
            reason = f"failed to stream image data for {filepath}: #{e.code()} - {e.details()}"
            requeue = True
        except (ValueError, TypeError, IndexError) as e:
            reason = f"Bad image input or parsing error: {e}"
            requeue = False
        except Cv2Error as e:
            reason = f"OpenCV failed to decode image: {e}"
            requeue = False
        except RuntimeError as e:
            reason = f"{self.description} failed: {e}"
            requeue = True
        except ValidationError as e:
            reason = f"{self.description} validation failed: {e}"
            requeue = False
        except Exception as e:
            reason = f"Unexpected error in {self.description}: {e}"
            requeue = True

        logger.error(reason)
        if not acked:
            await self.reject_message(
                reason,
                data=data,
                message=message,
                corr_id=corr_id,
                jwe_token=jwe_token,
                requeue=requeue,
            )

    async def reject_message(
        self,
        reason: str,
        data: RabbitMqMessage,
        message: IncomingMessage,
        corr_id: str | None,
        jwe_token: str | None,
        requeue=False,
    ):
        logger = get_logger("Workflow/reject_message", corr_id=corr_id)
        logger.info(f"rejecting message due to: {reason} for file: {data.filepath}")
        try:
            await message.nack(requeue=requeue)
            await self.sender.send_json_message(
                JOB_MANAGER_QUEUE,
                {},
                filepath=data.filepath,
                md5=data.md5,
                job_id=data.jobId,
                corr_id=corr_id,
                jwe_token=jwe_token,
                errors=[reason],
            )
            logger.debug(
                f"error message sent back to queue {JOB_MANAGER_QUEUE} for {data.filepath}"
            )
        except (ChannelClosed, ConnectionClosed) as e:
            logger.error(f"Failed to acknowledge message: connection issue - {e}")
        except MessageProcessError as e:
            logger.error(f"Failed to process message ack: {e}")
        except Exception as e:
            logger.error(f"Unexpected error during ack: {e}")

    async def process_image(self, filepath: str, corr_id: str, jwe_token: str) -> T:
        logger = get_logger("Workflow/process_image", corr_id=corr_id)
        logger.debug(f"streaming image data for {filepath}...")
        image_data = await self.jobManagerClient.get_image_data(
            filepath, corr_id=corr_id, jwe_token=jwe_token
        )
        logger.debug(f"{self.description} for {filepath}")
        extracted_data = self.extract_data(image_data)
        logger.debug(f"{self.description} completed for {filepath}")
        return extracted_data
