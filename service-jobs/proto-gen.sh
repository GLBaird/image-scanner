#!/bin/bash

pnpm proto-loader-gen-types --grpcLib=@grpc/grpc-js --outDir=generated protos/*.proto
