import * as dotenv from 'dotenv';

dotenv.config();

const config = {
    stageInfo: { name: 'Exif and Metadata Extraction', queueName: 'ExifExtractor' },
    jobManagerQueue: process.env.JOB_MANAGER_QUEUE || 'JobManager',
    concurrencyLimit: process.env.CONCURRENCY_LIMIT || '100',
    maxInflight: process.env.MAX_INFLIGHT || '200',
    grpc: {
        jobManagerHost: process.env.GRPC_JOB_MANAGER_HOST || 'localhost',
        jobManagerPort: Number.parseInt(process.env.GRPC_JOB_MANAGER_PORT || '5042') ?? 5042,
    },
};

export default config;
