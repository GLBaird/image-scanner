import os
from typing import TypedDict
from lib.utils import parse_int


class RabbitMqConnectionSettings(TypedDict):
    hostname: str
    port: int
    username: str
    password: str
    vhost: str


class RabbitMqSettings(TypedDict):
    connection_settings: RabbitMqConnectionSettings
    service_queue_name: str
    job_manager_queue_name: str
    prefetchLimit: int


class LoggerSettings(TypedDict):
    combined_log: str
    error_log: str
    level: str
    format: str
    stdout_format: str
    retention: str
    file_size: str


class GrpcSettings(TypedDict):
    job_manager_host: str
    job_manager_port: int


class Config(TypedDict):
    rabbitmq: RabbitMqSettings
    logger: LoggerSettings
    grpc: GrpcSettings


default_format = "<green>[{time}]</green> <level>[{level}]</level> <blue>[{extra[id]}]</blue> <blue>[{extra[corr_id]}]</blue> {message}"

config: Config = {
    "rabbitmq": {
        "connection_settings": {
            "host": os.environ.get("RABBITMQ_HOST", "localhost"),
            "port": parse_int(os.environ.get("RABBITMQ_PORT", "5672"), 5672),
            "login": os.environ.get("RABBITMQ_USERNAME", "admin"),
            "password": os.environ.get("RABBITMQ_PASSWORD", "secret"),
            "virtualhost": os.environ.get("RABBITMQ_VHOST", "/"),
        },
        # This env variable must be set to define the name of this service on the queue
        # This resource is shared with multiple services, so the queuename for the service must be set
        "service_queue_name": os.environ.get(
            "RABBIT_MQ_SERVICE_QUEUE_NAME", "Classifier"
        ),
        "job_manager_queue_name": os.environ.get(
            "RABBIT_MQ_JOB_MANAGER_QUEUE_NAME", "JobManager"
        ),
        "prefetchLimit": parse_int(
            os.environ.get("RABBIT_MQ_PREFETCH_LIMIT", "10"), 10
        ),
    },
    "logger": {
        "combined_log": os.environ.get(
            "LOG_PATH_COMBINED", "../logs/service_{time}.log"
        ),
        "error_log": os.environ.get("LOG_PATH_ERROR", "../logs/errors_{time}.log"),
        "level": os.environ.get("LOG_LEVEL", "DEBUG"),
        "format": os.environ.get(
            "LOG_FORMAT",
            "[{time}] [{level}] [{extra[id]}] [{extra[corr_id]}] {message}",
        ),
        "stdout_format": os.environ.get("LOG_STDOUT_FORMAT", default_format),
        "retention": os.environ.get("LOG_RETENTION", "30 Days"),
        "file_size": os.environ.get("LOG_SIZE", "300 MB"),
    },
    "grpc": {
        "job_manager_host": os.environ.get("GRPC_JOB_MANAGER_HOST", "localhost"),
        "job_manager_port": parse_int(
            os.environ.get("GRPC_JOB_MANAGER_PORT", "5042"), 5042
        ),
    },
}
