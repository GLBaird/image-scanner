  #!/usr/bin/env bash

# Make the generated dir if not there already
mkdir -p src/generated

# Generate python code and stubs
python -m grpc_tools.protoc \
  --proto_path=protos \
  --python_out=src/generated \
  --grpc_python_out=src/generated \
  protos/service-jobs.proto

sed -i '' 's/^import service_jobs_pb2/import generated.service_jobs_pb2/' src/generated/service_jobs_pb2_grpc.py

