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
        // This env variable must be set to define the name of this service on the queue
        // This resource is shared with multiple services, so the queuename for the service must be set
        serviceQueueName: process.env.RABBIT_MQ_SERVICE_QUEUE_NAME,
        prefectLimit: Number.parseInt(process.env.RABBIT_MQ_PREFECT_LIMIT ?? '1000', 10) ?? 1000,
    },
    logger: {
        combinedLog: path.resolve(__dirname, '../logs/combined.log'),
        errorLog: path.resolve(__dirname, '../logs/error.log'),
        level: process.env.LOG_LEVEL || 'debug',
        serviceName: process.env.SERVICE_NAME || 'image-scanner-service',
    },
};

if (!config.rabbitMq.serviceQueueName) {
    throw new Error(
        'Missing env variable RABBIT_MQ_SERVICE_QUEUE_NAME, you must set this variable before starting the service, see shared-services/configs/config.ts',
    );
}

export default config;
