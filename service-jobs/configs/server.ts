import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
    port: process.env.PORT || 5042,
    logger: {
        combinedLog: path.resolve(__dirname, '../logs/combined.log'),
        errorLog: path.resolve(__dirname, '../logs/error.log'),
        level: process.env.LOG_LEVEL || 'debug',
    },
    db: {
        connectionProtocol: process.env.DB_PROTOCOL || 'mongodb://',
        host: process.env.DB_HOST || 'localhost',
        username: process.env.DB_USER || 'qumodo_root',
        password: process.env.DB_PASSWORD || 'qumodo_password',
        port: process.env.DB_PORT || 27017,
        dbName: process.env.DB_NAME || 'ecosystem_data',
        config: process.env.DB_CONFIG || '?authSource=admin',
    },
    auth: {
        secret: process.env.AUTH_SECRET || 'jqE4YdBGILNOKsBJUKwyFkM3k99+ePINsVptlNEukPo=',
    },
    rabbitMq: {
        host: process.env.RABBIT_MQ_HOST || 'amqp://localhost',
        channel: process.env.RABBIT_MQ_CHANNEL || 'EcoV2SourceService',
        ingestControllerChannel:
            process.env.RABBIT_MQ_INGEST_CONTROLLER_CHANNEL || 'EcoV2JobManager',
    },
    fileScan: {
        minFileSize: Number.parseInt(process.env.FILESCAN_MIN_FILESIZE || '100', 10),
        maxProcesses: Number.parseInt(process.env.FILESCAN_MAX_PROCESSES || '100', 10),
    },
};

export default config;
