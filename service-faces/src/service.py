from modules.logger import setup_logging, get_logger


def main():
    setup_logging()
    logger = get_logger("main")
    logger.info("launching service...")


if __name__ == "__main__":
    main()
