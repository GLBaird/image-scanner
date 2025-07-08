import sys
from loguru import logger
from service_python_shared.configs.config import config


def setup_logging():
    conf = config["logger"]
    logger.remove()
    logger.add(
        sys.stdout,
        colorize=True,
        level=conf["level"],
        format=conf["stdout_format"],
    )
    logger.add(
        conf["combined_log"],
        rotation=conf["file_size"],
        retention=conf["retention"],
        level=conf["level"],
        format=conf["format"],
    )
    logger.add(
        conf["error_log"],
        rotation=conf["file_size"],
        retention=conf["retention"],
        level="ERROR",
        format=conf["format"],
    )


def get_logger(id: str, corr_id: str = ""):
    contextual_logger = logger.bind(id=id, corr_id=corr_id)
    return contextual_logger
