#!/bin/bash

pnpm proto-loader-gen-types --grpcLib=@grpc/grpc-js --outDir=src/generated src/grpc/protos/*.proto
