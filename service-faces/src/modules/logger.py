import sys
from loguru import logger
from configs.config import config


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


def get_logger(id: str, corrId: str = ""):
    contextual_logger = logger.bind(id=id, corrId=corrId)
    return contextual_logger
