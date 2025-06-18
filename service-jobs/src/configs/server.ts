import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
    port: process.env.PORT || 5042,
    source: process.env.SOURCE_FOLDER || path.resolve(__dirname, '../../sources'),
    concurrencyLimit: process.env.CONCURRENCY_LIMIT || '100',
    maxInflight: process.env.MAX_INFLIGHT || '200',
    serverSideEventsPort: {
        http: process.env.SERVER_SIDE_EVENTS_PORT_HTTP || '4042',
        https: process.env.SERVER_SIDE_EVENTS_PORT_HTTPS || '4043',
    },
    db: {
        // Here for reference, needs to be set as ENV variable
        dbUrl: process.env.DATABASE_URL!,
        // example: 'postgresql://postgres:postgres@localhost:5432/scanner-jobs?schema=public',
    },
    auth: {
        secret:
            // Auth secret must be the same as used by frontend service under Auth.JS
            process.env.AUTH_SECRET ||
            'oRVQGb1cDGLdbhXrP1DT0Kqym81MYl5WfOKibjtTtxGP62h+Ot1NA+3eX8VUPIH0h4+O65dhnm79hF7k5kjQhQ==',
    },
    frontend: {
        origin: 'http://localhost:3000',
    },
    dataExtractionStages: [
        { name: 'Exif and Metadata Extraction', queueName: 'ExifExtractor' },
        // { name: 'Face Recognition', queueName: 'Faces' },
        // { name: 'Image Tag Classification', queueName: 'Classifier' },
    ],
    batchSizeStreaming: Number.parseInt(process.env.BATCH_SIZE_STREAMING || '1000', 10) ?? 1000,
    fileScan: {
        minFileSize: Number.parseInt(process.env.FILESCAN_MIN_FILESIZE || '100', 10) ?? 100,
    },
};

if (!config.db.dbUrl) {
    throw new Error('Missing ENV Variables: DATABASE_URL -- must be set! See src/config/server.ts');
}

export default config;
