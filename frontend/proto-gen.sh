#!/bin/bash

pnpm proto-loader-gen-types --grpcLib=@grpc/grpc-js --outDir=src/generated protos/*.proto
