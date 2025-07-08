import asyncio
import logging
from typing import Optional, List

import grpc
from grpc import aio

from service_python_shared.configs.config import config
from service_python_shared.generated.service_jobs_pb2 import GetDataRequest
from service_python_shared.generated.service_jobs_pb2_grpc import (
    JobManagerControllerStub,
)

logger = logging.getLogger("JobManagerClient")


class JobManagerClient:
    _client: Optional[JobManagerControllerStub] = None
    _channel: Optional[aio.Channel] = None

    @classmethod
    async def connect(cls):
        domain = config["grpc"]["job_manager_host"]
        port = config["grpc"]["job_manager_port"]
        address = f"{domain}:{port}"
        logger.info(f"Connecting to JobManager gRPC service at: {address}")

        cls._channel = aio.insecure_channel(address)
        cls._client = JobManagerControllerStub(cls._channel)

        try:
            await asyncio.wait_for(cls._channel.channel_ready(), timeout=5)
            logger.info(f"Connected to JobManager gRPC on {address}")
        except asyncio.TimeoutError:
            logger.error(f"Timed out connecting to JobManager gRPC at {address}")
            raise

    @classmethod
    async def get_image_data(
        cls, image_source: str, corr_id: str, jwe_token: str
    ) -> bytes:
        if cls._client is None:
            raise RuntimeError("Client not connected. Call connect() first.")

        metadata = (
            ("x-correlation-id", corr_id),
            ("authorization", jwe_token),
        )

        buffer: List[bytes] = []
        log_id = f"getImageData:{corr_id}"

        request = GetDataRequest(filepath=image_source)
        try:
            async for response in cls._client.getData(request, metadata=metadata):
                if response.data:
                    buffer.append(response.data)
        except grpc.RpcError as e:
            logger.error(f"Error streaming image data: {e}", extra={"id": log_id})
            raise

        logger.debug(
            f"Completed streaming image data for {image_source}", extra={"id": log_id}
        )
        return b"".join(buffer)

    @classmethod
    async def close_grpc_socket(cls):
        if cls._channel:
            await cls._channel.close()
            logger.info(
                "gRPC client closed connection", extra={"id": "closeGrpcSocket"}
            )
            cls._client = None
            cls._channel = None
