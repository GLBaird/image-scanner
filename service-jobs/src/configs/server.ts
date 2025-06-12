import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const config = {
    port: process.env.PORT || 5042,
    serverSideEventsPort: {
        http: process.env.SERVER_SIDE_EVENTS_PORT_HTTP || '4042',
        https: process.env.SERVER_SIDE_EVENTS_PORT_HTTPS || '4043',
    },
    logger: {
        combinedLog: path.resolve(__dirname, '../logs/combined.log'),
        errorLog: path.resolve(__dirname, '../logs/error.log'),
        level: process.env.LOG_LEVEL || 'debug',
    },
    db: {},
    auth: {
        secret:
            process.env.AUTH_SECRET ||
            'oRVQGb1cDGLdbhXrP1DT0Kqym81MYl5WfOKibjtTtxGP62h+Ot1NA+3eX8VUPIH0h4+O65dhnm79hF7k5kjQhQ==',
    },
    frontend: {
        origin: 'http://localhost:3000',
    },
    rabbitMq: {
        host: process.env.RABBIT_MQ_HOST || 'amqp://localhost',
        channel: process.env.RABBIT_MQ_CHANNEL || 'JobManager',
    },
    fileScan: {
        minFileSize: Number.parseInt(process.env.FILESCAN_MIN_FILESIZE || '100', 10),
    },
};

export default config;
