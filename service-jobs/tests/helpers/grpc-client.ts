import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoloader from '@grpc/proto-loader';
import { ProtoGrpcType } from '../../src/generated/service-jobs';
import { JobManagerControllerClient } from '../../src/generated/jobmanager/JobManagerController';
import config from '../../src/configs/server';

const PROTO_FILE = '../../protos/service-jobs.proto';

const packageDef = protoloader.loadSync(path.resolve(__dirname, PROTO_FILE));
const grpcObj = grpc.loadPackageDefinition(packageDef) as unknown as ProtoGrpcType;

const grpcDomain = process.env.TEST_GRPC_DOMAIN || '0.0.0.0';

function getTestClient(): Promise<JobManagerControllerClient> {
    const timeout = new Date();
    timeout.setSeconds(timeout.getSeconds() + 5);
    console.log(`connecting to: ${grpcDomain}:${config.port}`);
    const client = new grpcObj.jobmanager.JobManagerController(
        `${grpcDomain}:${config.port}`,
        grpc.credentials.createInsecure(),
    );
    return new Promise((resolve, reject) => {
        client.waitForReady(timeout, (err) => {
            if (err) {
                return reject(err);
            }
            resolve(client);
            console.log('gRPC Client Connected');
        });
    });
}

export default getTestClient;
