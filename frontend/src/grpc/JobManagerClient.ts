import 'server-only';

import * as grpc from '@grpc/grpc-js';
import { getCorrId } from '@/lib/corr-id';
import logger from '@/lib/logger';
import { EnvVariables, getEnv } from '@/envs';
import { ProtoGrpcType } from '@/generated/service-jobs';
import { JobManagerControllerClient } from '@/generated/jobmanager/JobManagerController';
import getAuthToken from '@/lib/get-token';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// instead of `import protoLoader from '@grpc/proto-loader';`
const protoloader: typeof import('@grpc/proto-loader') = (() => {
    // Turbopack can’t see inside this IIFE, so it won’t error
    // but at runtime Node will correctly `require` the module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@grpc/proto-loader');
})();

class JobManagerClient {
    private static shared = new JobManagerClient();

    private client?: JobManagerControllerClient;
    private connectionAttempts = 0;
    MAX_CONNECTION_ATTEMPTS = 10;
    TIME_BETWEEN_CONNECTION_ATTEMPTS = 2000;

    public grpcDomain = getEnv(EnvVariables.grpcDomain);
    public grpcPort = getEnv(EnvVariables.grpcPort);

    public static get(): JobManagerClient {
        return this.shared;
    }

    public static getClient(): Promise<JobManagerControllerClient> {
        return this.shared.getClient();
    }

    public async getClient(): Promise<JobManagerControllerClient> {
        if (this.client) return this.client;

        const packageDef = protoloader.loadSync('src/grpc/protos/service-jobs.proto');
        const grpcObj = grpc.loadPackageDefinition(packageDef) as unknown as ProtoGrpcType;

        const timeout = new Date();
        timeout.setSeconds(timeout.getSeconds() + 5);
        logger.info(`connecting grpc client to: ${this.grpcDomain}:${this.grpcPort}`);

        const address = `${this.grpcDomain}:${this.grpcPort}`;
        this.client = new grpcObj.jobmanager.JobManagerController(address, grpc.credentials.createInsecure());

        while (this.connectionAttempts < this.MAX_CONNECTION_ATTEMPTS) {
            this.connectionAttempts += 1;

            logger.info(`gRPC connection attempt ${this.connectionAttempts}/${this.MAX_CONNECTION_ATTEMPTS}`);

            const timeout = new Date();
            timeout.setSeconds(timeout.getSeconds() + 5);

            try {
                await new Promise<void>((resolve, reject) => {
                    this.client!.waitForReady(timeout, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });

                logger.info(`Connected to JobManager gRPC on ${address}`);
                this.connectionAttempts = 0;
                return this.client!;
            } catch (err: unknown) {
                const message = (err as Error)?.message ?? err;
                logger.warn(`gRPC connection failed: ${message}`);
                if (this.connectionAttempts >= this.MAX_CONNECTION_ATTEMPTS) {
                    logger.error('Max connection attempts reached — aborting service.');
                    process.exit(1);
                }

                logger.info(`Retrying in ${this.TIME_BETWEEN_CONNECTION_ATTEMPTS / 1000} seconds...`);
                await sleep(this.TIME_BETWEEN_CONNECTION_ATTEMPTS);
            }
        }

        return this.client!; // will never be reached - either return from loop or process.exit - here for return type on compiler.
    }

    private constructor() {}

    public static async getRequestHeaders(overrideCorrId?: string): Promise<grpc.Metadata> {
        const corrId = overrideCorrId ?? (await getCorrId());
        const token = await getAuthToken();
        const metaData = new grpc.Metadata();
        metaData.set('x-correlation-id', corrId);
        metaData.set('authorization', `Bearer ${token}`);
        return metaData;
    }
}

export default JobManagerClient;
