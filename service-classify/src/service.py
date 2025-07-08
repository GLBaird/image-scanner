import asyncio
from service_python_shared.modules.logger import setup_logging, get_logger
from service_python_shared.modules.Workflow import Workflow
from modules.classify_image import classify_image


async def main():
    setup_logging()
    logger = get_logger("main")
    logger.info("launching service...")
    workflow = Workflow(description="classify image", extract_data=classify_image)
    await workflow.start_receiving_messages()


if __name__ == "__main__":
    print("service running...")
    asyncio.run(main())
