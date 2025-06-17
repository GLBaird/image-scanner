import * as path from 'path';

const config = {
    rabbitMq: {
        connectSettings: {
            hostname: process.env.RABBITMQ_HOST || 'localhost',
            port: Number.parseInt(process.env.RABBITMQ_PORT || '5672', 10) ?? 5672,
            username: process.env.RABBITMQ_USERNAME || 'admin',
            password: process.env.RABBITMQ_PASSWORD || 'secret',
            vhost: process.env.RABBITMQ_VHOST || '/',
        },
        serviceQueueName: process.env.RABBIT_MQ_SERVICE_QUEUE_NAME || 'image-scanner-service',
    },
    logger: {
        combinedLog: path.resolve(__dirname, '../logs/combined.log'),
        errorLog: path.resolve(__dirname, '../logs/error.log'),
        level: process.env.LOG_LEVEL || 'debug',
        serviceName: process.env.SERVICE_NAME || 'image-scanner-service',
    },
};

export default config;
