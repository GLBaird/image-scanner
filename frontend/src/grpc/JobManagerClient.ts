import 'server-only';

import * as grpc from '@grpc/grpc-js';
import { getCorrId } from '@/lib/corr-id';
import logger from '@/lib/logger';
import { EnvVariables, getEnv } from '@/envs';
import { ProtoGrpcType } from '@/generated/service-jobs';
import { JobManagerControllerClient } from '@/generated/jobmanager/JobManagerController';
import getAuthToken from '@/lib/get-token';

// instead of `import protoLoader from '@grpc/proto-loader';`
const protoloader: typeof import('@grpc/proto-loader') = (() => {
    // Turbopack can’t see inside this IIFE, so it won’t error
    // but at runtime Node will correctly `require` the module.
    // @ts-ignore
    return require('@grpc/proto-loader');
})();

class JobManagerClient {
    private static shared = new JobManagerClient();

    private client?: JobManagerControllerClient;

    public grpcDomain = getEnv(EnvVariables.grpcDomain);
    public grpcPort = getEnv(EnvVariables.grpcPort);

    public static get(): JobManagerClient {
        return this.shared;
    }

    public static getClient(): Promise<JobManagerControllerClient> {
        return this.shared.getClient();
    }

    public getClient(): Promise<JobManagerControllerClient> {
        if (this.client) return new Promise((resolve) => resolve(this.client!));

        const packageDef = protoloader.loadSync('src/grpc/protos/service-jobs.proto');
        const grpcObj = grpc.loadPackageDefinition(packageDef) as unknown as ProtoGrpcType;

        const timeout = new Date();
        timeout.setSeconds(timeout.getSeconds() + 5);
        logger.info(`connecting grpc client to: ${this.grpcDomain}:${this.grpcPort}`);
        this.client = new grpcObj.jobmanager.JobManagerController(
            `${this.grpcDomain}:${this.grpcPort}`,
            grpc.credentials.createInsecure(),
        );
        return new Promise((resolve, reject) => {
            this.client!.waitForReady(timeout, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve(this.client!);
                logger.info('gRPC client JobManager connected');
            });
        });
    }

    private constructor() {}

    public static async getRequestHeaders(): Promise<grpc.Metadata> {
        const corrId = await getCorrId();
        const token = await getAuthToken();
        const metaData = new grpc.Metadata();
        metaData.set('x-correlation-id', corrId);
        metaData.set('authorization', `Bearer ${token}`);
        return metaData;
    }
}

export default JobManagerClient;
