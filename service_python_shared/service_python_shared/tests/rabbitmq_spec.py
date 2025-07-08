import asyncio
from aio_pika import IncomingMessage
from datetime import datetime, timezone
import pytest

from service_python_shared.modules.rabbitmq import (
    RabbitMqConnection,
    RabbitMqMessageSender,
    RabbitMqMessageReceiver,
    RabbitMqMessage,
)
from service_python_shared.configs.config import config


QUEUE_1 = "tester"
QUEUE_2 = "tester-2"
JOB_ID = "test-job-id"
CORR_ID = "test-corr-id"
JWE_TOKEN = "encrypted-jwt-token"
SENDER_ID = config["rabbitmq"]["service_queue_name"]
TEST_MESSAGE = "this is a test message"


@pytest.mark.asyncio
@pytest.mark.timeout(5)
async def test_connect_and_disconnect():
    conn = RabbitMqConnection(QUEUE_1)
    assert conn
    assert conn.is_connected() is False
    await conn.connect()
    assert conn.is_connected() is True
    await conn.close()
    assert conn.is_connected() is False
    assert conn.queue_name == QUEUE_1


@pytest.mark.asyncio
@pytest.mark.timeout(5)
async def test_send_message_with_sender():
    sender = RabbitMqMessageSender(QUEUE_1)
    assert sender
    assert sender.is_connected() is False

    await sender.send_json_message(
        queue_name=QUEUE_1,
        message=TEST_MESSAGE,
        filepath="dummy-path",
        md5="dummy-md5",
        job_id=JOB_ID,
        corr_id=CORR_ID,
        jwe_token=JWE_TOKEN,
        persistent=False,
    )

    assert sender.is_connected() is True
    assert sender.get_queue_name() == QUEUE_1
    await sender.close()
    assert sender.is_connected() is False


@pytest.mark.asyncio
@pytest.mark.timeout(5)
async def test_send_message_from_a_to_b_and_check_headers():
    sender = RabbitMqMessageSender(QUEUE_2)
    receiver = RabbitMqMessageReceiver(QUEUE_2)

    assert sender and receiver
    assert receiver.is_connected() is False
    assert sender.get_queue_name() == QUEUE_2
    assert receiver.get_queue_name() == QUEUE_2

    await sender.send_json_message(
        queue_name=QUEUE_2,
        message=TEST_MESSAGE,
        filepath="dummy-path",
        md5="dummy-md5",
        job_id=JOB_ID,
        corr_id=CORR_ID,
        jwe_token=JWE_TOKEN,
        persistent=False,
    )
    assert sender.is_connected()

    # Wrap in a timeout so the test doesn't hang indefinitely
    async def receive_once():
        fut = asyncio.get_event_loop().create_future()

        async def handler(
            message_received: RabbitMqMessage[str], message_source: IncomingMessage
        ):
            assert message_received.from_ == SENDER_ID
            assert message_received.to == QUEUE_2
            assert message_received.jobId == JOB_ID
            assert message_received.message == TEST_MESSAGE
            today = datetime.now(timezone.utc).date().isoformat()
            message_date = message_received.time.split("T")[0]
            assert message_date == today

            corr_id_header = message_source.headers.get("x-correlation-id")
            auth_header = message_source.headers.get("authorization")

            assert corr_id_header == CORR_ID
            assert auth_header == f"Bearer {JWE_TOKEN}"

            await message_source.ack()
            fut.set_result(True)

        await receiver.get_messages_on_queue(handler)
        await asyncio.wait_for(fut, timeout=3)

    await receive_once()

    await sender.close()
    await receiver.close()

    assert sender.is_connected() is False
    assert receiver.is_connected() is False
