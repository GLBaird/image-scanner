# Shared services for python

This code is the main service runner for any services which run under python. You will need to install this into your
service using:

```bash
pip install ../service-python-shared
```

and add to requirements as

```
../service-python-shared
```

use `-e` for editable if you want the service to reload if developing.

When setting up your serice, create `service.py` and use the following boiler plate code.

You will need to create your method for extracting data, which you give when instantaiting the serice, and has the
folowing method signature:

```python
def extract_data(image_data: Bytes) -> List[str]:
    # code for extracting image data
```

You can type your exports from your extract data function, but must be compatible with JSON encoding. It can be `any`,
in the above example the extracted data will be in the form of an array of strings.

```python
service.py

import asyncio
from service-python-shared.services.modules.logger import setup_logging, get_logger
from service-python-shared.services.modules.Workflow import Workflow
from modules.data import extract_data

async def main():
    setup_logging()
    logger = get_logger("main")
    logger.info("launching service...")
    workflow = Workflow(description="extract image data demo", extract_data=extract_data)
    await workflow.start_receiving_messages()


if __name__ == "__main__":
    print("service running...")
    asyncio.run(main())

```

## Env variables

See `src/configs/config.py` for a complete list of all envirobment variables used here, and which are compulsory and
which have default fallbacks (suitable for development).

Here are a summary of those variables:

| name                             | description                | default                       | compulsory |
| -------------------------------- | -------------------------- | ----------------------------- | ---------- |
| RABBITMQ_HOST                    |                            | "localhost"                   |            |
| RABBITMQ_PORT                    |                            | "5672"                        |            |
| RABBITMQ_USERNAME                |                            | "admin"                       |            |
| RABBITMQ_PASSWORD                |                            | "secret"                      |            |
| RABBITMQ_VHOST                   |                            | "/"                           |            |
| RABBIT_MQ_JOB_MANAGER_QUEUE_NAME | name of queue for service  |                               | YES        |
| RABBIT_MQ_PREFETCH_LIMIT         | prefetch limit on messages | "10"                          |            |
| LOG_PATH_COMBINED                | location of log files      | "../logs/service\_{time}.log" |            |
| LOG_PATH_ERROR                   | location of error logs     | "../logs/errors\_{time}.log"  |            |
| LOG_LEVEL                        |                            | "DEBUG"                       |            |
| LOG_FORMAT                       | format of log files        | see config...                 |            |
| LOG_STDOUT_FORMAT                | format of onscreen logs    | see config...                 |            |
| LOG_RETENTION                    |                            | "30 Days"                     |            |
| LOG_SIZE                         | rotation size of logs      | "300 MB"                      |            |
| GRPC_JOB_MANAGER_HOST            |                            | "localhost"                   |            |
| GRPC_JOB_MANAGER_PORT            |                            | "5042"                        |            |

## Running tests

Use pytest for running tests in module mode:

```bash
pytest -m

```
