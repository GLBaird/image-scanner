import asyncio
from service_python_shared.modules.logger import setup_logging, get_logger
from service_python_shared.modules.Workflow import Workflow
from modules.detect_faces import detect_faces


async def main():
    setup_logging()
    logger = get_logger("main")
    logger.info("launching service...")
    workflow = Workflow(description="extract faces", extract_data=detect_faces)
    await workflow.start_receiving_messages()


if __name__ == "__main__":
    print("service running...")
    asyncio.run(main())
