  #!/usr/bin/env bash

# Make the generated dir if not there already and __init__.py
# clear file of existing generated files
mkdir -p service_python_shared/generated
rm -f service_python_shared/generated/service_jobs_pb2_grpc.py
rm -f service_python_shared/generated/service_jobs_pb2.py
INIT_FILE="service_python_shared/generated/__init__.py"
if [ ! -f "$INIT_FILE" ]; then
  touch "$INIT_FILE"
fi

# Generate python code and stubs
python -m grpc_tools.protoc \
  --proto_path=service_python_shared/protos \
  --python_out=service_python_shared/generated \
  --grpc_python_out=service_python_shared/generated \
  service_python_shared/protos/service-jobs.proto

# need to update generated code so will import correctly when run as a module
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' 's/^import service_jobs_pb2/import service_python_shared.generated.service_jobs_pb2/' service_python_shared/generated/service_jobs_pb2_grpc.py
else
  sed -i 's/^import service_jobs_pb2/import service_python_shared.generated.service_jobs_pb2/' service_python_shared/generated/service_jobs_pb2_grpc.py
fi