import * as path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoloader from '@grpc/proto-loader';
import { ProtoGrpcType } from '../../src/generated/service-jobs';
import { JobManagerControllerClient } from '../../src/generated/jobmanager/JobManagerController';
import config from '../config/server';
import logger, { getLoggerMetaFactory } from '../../../service-shared/logger';
import { GetDataResponse } from '../generated/jobmanager/GetDataResponse';

const PROTO_FILE = '../../protos/service-jobs.proto';

const packageDef = protoloader.loadSync(path.resolve(__dirname, PROTO_FILE));
const grpcObj = grpc.loadPackageDefinition(packageDef) as unknown as ProtoGrpcType;

const makeLogId = getLoggerMetaFactory('JobManagerClient');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class JobManagerClient {
    private static client: JobManagerControllerClient;
    private static connectionAttempts = 0;
    static MAX_CONNECTION_ATTEMPTS = 10;
    static TIME_BETWEEN_CONNECTION_ATTEMPTS = 2000;

    static async connect() {
        const logId = makeLogId('connect');
        const timeout = new Date();
        timeout.setSeconds(timeout.getSeconds() + 5);
        const domain = config.grpc.jobManagerHost;
        const port = config.grpc.jobManagerPort;
        const address = `${domain}:${port}`;
        logger.info(`connecting to JobManager gRPC service at: ${address}`);
        this.client = new grpcObj.jobmanager.JobManagerController(
            address,
            grpc.credentials.createInsecure(),
        );

        while (this.connectionAttempts < this.MAX_CONNECTION_ATTEMPTS) {
            this.connectionAttempts += 1;

            logger.info(
                `gRPC connection attempt ${this.connectionAttempts}/${this.MAX_CONNECTION_ATTEMPTS}`,
            );

            const timeout = new Date();
            timeout.setSeconds(timeout.getSeconds() + 5);

            try {
                await new Promise<void>((resolve, reject) => {
                    this.client.waitForReady(timeout, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });

                logger.info(`Connected to JobManager gRPC on ${address}`, logId);
                this.connectionAttempts = 0;
                return;
            } catch (err) {
                logger.warn(`gRPC connection failed: ${err.message}`);
                if (this.connectionAttempts >= this.MAX_CONNECTION_ATTEMPTS) {
                    logger.error('Max connection attempts reached — aborting service.');
                    process.exit(1);
                }

                logger.info(
                    `Retrying in ${this.TIME_BETWEEN_CONNECTION_ATTEMPTS / 1000} seconds...`,
                );
                await sleep(this.TIME_BETWEEN_CONNECTION_ATTEMPTS);
            }
        }
    }

    static getImageData(
        imageSource: string,
        corrId: string,
        jweToken: string,
    ): Promise<Buffer<ArrayBuffer>> {
        const logId = makeLogId('getImageData', corrId);
        return new Promise((resolve, reject) => {
            const meta = new grpc.Metadata();
            meta.set('x-correlation-id', corrId);
            meta.set('authorization', jweToken);

            const stream = this.client.getData({ filepath: imageSource }, meta);
            const buffer: Buffer[] = [];

            stream.on('data', (response: GetDataResponse) => {
                const chunk = response.data as Buffer;
                if (chunk) {
                    buffer.push(chunk);
                }
            });

            stream.on('end', () => {
                const completeBuffer = Buffer.concat(buffer);
                resolve(completeBuffer);
                logger.debug(`completed streaming image data for filepath: ${imageSource}`, logId);
            });

            stream.on('error', (err) => {
                logger.error(`error streaming image data from JobManager: ${err}`, logId);
                reject(err);
            });
        });
    }

    static closeGrpcSocket() {
        this.client.close();
        logger.info('gRPC client closed connection', makeLogId('closeGrpcSocket'));
    }
}

export default JobManagerClient;
