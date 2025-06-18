import logger from '../../service-shared/logger';
import JobManagerClient from './controllers/JobManagerClient';
import MessageCenter from './controllers/MessageCenter';

const logId = { id: 'ExifExtractor/main' };

async function main() {
    logger.info('Launching exif extractor service...', logId);

    logger.info('Starting gRPC connection to JobManager...', logId);
    await JobManagerClient.connect();

    logger.info('Starting MessageCenter listening on RabbitMq', logId);
    const messageCenter = new MessageCenter();
    await messageCenter.startService();
}

main()
    .then(() => logger.info('service has eneded', logId))
    .catch((error) => {
        logger.error(`Service has exited with an error: ${error}`, logId);
        process.exit(1);
    });
