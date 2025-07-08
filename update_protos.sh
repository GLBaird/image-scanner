#!/bin/bash

# There should be one source of truth for proto files, which are located in the folder
# /protos/ in the root of each service folder. However, services need the proto files of 
# other services and they need to be in the `build` folder of each service for containerisation.
# so git ignore files have been placed to ignore all external protos and only commit protos which
# belong to each service. This script will propogate all protos from their 'origin' and copy them into
# each of the services proto folders, where they will be ignored by git. This need to be done every time
# the truth version of each proto is updated, and prior to any build or containerisation.

# copy service-jobs proto
echo "copying: service-jobs proto >>> frontend/src/grpc/protos/"
cp service-jobs/protos/service-jobs.proto frontend/src/grpc/protos

echo "copying: service-jobs proto >>> service-python-shared/protos/"
cp service-jobs/protos/service-jobs.proto service-python-shared/protos

echo "copying: service-jobs proto >>> service-exif/protos/"
cp service-jobs/protos/service-jobs.proto service-exif/protos
