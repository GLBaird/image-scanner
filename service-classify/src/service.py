import asyncio
from modules.logger import setup_logging, get_logger
from modules.Workflow import Workflow


async def main():
    setup_logging()
    logger = get_logger("main")
    logger.info("launching service...")
    workflow = Workflow()
    await workflow.start_receiving_messages()


if __name__ == "__main__":
    print("service running...")
    asyncio.run(main())
