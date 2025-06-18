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

class JobManagerClient {
    private static client: JobManagerControllerClient;

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
        await new Promise<void>((resolve, reject) => {
            this.client.waitForReady(timeout, (err) => {
                if (err) return reject(err);
                logger.info(`service is connected to JobManager via grpc on: ${address}`, logId);
                resolve();
            });
        });
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
