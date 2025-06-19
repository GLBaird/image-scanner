python -m grpc_tools.protoc \
  --proto_path=protos \
  --python_out=src/generated \
  --grpc_python_out=src/generated \
  protos/service-jobs.proto