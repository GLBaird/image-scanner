import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ProtoGrpcType } from './generated/service-jobs';
import JobManagerController from './controllers/JobManagerController';
import config from './configs/server';
import logger, { getLoggerMetaFactory } from './logger';

const PROTO_FILE = './protos/service-jobs.proto';

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE));
const grpcObj = grpc.loadPackageDefinition(
    packageDef,
) as unknown as ProtoGrpcType;
const sourcePackage = grpcObj.jobmanager;

function getServer() {
    const server = new grpc.Server();
    server.addService(
        sourcePackage.JobManagerController.service,
        JobManagerController,
    );
    return server;
}

function main() {
    const logMeta = getLoggerMetaFactory('/main')('');

    // setup gRPC
    const server = getServer();
    server.bindAsync(
        `0.0.0.0:${config.port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
            if (err) {
                logger.error(`failed to start grpc service: ${err}`, logMeta);
                process.exit(1);
            }
            logger.info(`gRPC service has started on port ${port}`, logMeta);
        },
    );
}

main();
