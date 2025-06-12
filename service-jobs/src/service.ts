import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ProtoGrpcType } from './generated/service-jobs';
import JobManagerController from './controllers/JobManagerController';
import config from './configs/server';
import logger, { getLoggerMetaFactory } from './logger';
import prisma from './prisma/client';
import ServerSideEventEmitter from './controllers/ServerSideEventEmitter';
import UIUpdatesController from './controllers/UIUpdatesController';

const PROTO_FILE = '../protos/service-jobs.proto';

const packageDef = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE));
const grpcObj = grpc.loadPackageDefinition(packageDef) as unknown as ProtoGrpcType;
const sourcePackage = grpcObj.jobmanager;

function getServer() {
    const server = new grpc.Server();
    server.addService(sourcePackage.JobManagerController.service, JobManagerController);
    return server;
}

const logId = getLoggerMetaFactory('/main')('');

function main() {
    // setup gRPC
    const server = getServer();
    server.bindAsync(
        `0.0.0.0:${config.port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
            if (err) {
                logger.error(`failed to start grpc service: ${err}`, logId);
                process.exit(1);
            }
            logger.info(`gRPC service has started on port ${port}`, logId);
        },
    );

    // start server side events emitter for ui updates
    ServerSideEventEmitter.get().startServer();

    // ensure UI updates are loaded and ready
    const uuc = UIUpdatesController.get();
    if (uuc.serviceReady()) logger.info('UI Updates ready.', logId);
    else logger.error('UI updates have failed to initialise!', logId);
}

// launch service and error catch to disconnect from prisma
try {
    main();
} catch (error) {
    logger.error(`service error: ${error}`, logId);
    prisma.$disconnect().then(() => process.exit(1));
}
