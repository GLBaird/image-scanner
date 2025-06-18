import * as ampq from 'amqplib';
import exifr from 'exifr';
import { RabbitMqMessage } from '../../../service-shared/rabbitMq';
import ImageData from '../../../service-shared/rabbitMq/types/ImageData';
import MessageCenter from './MessageCenter';
import logger, { getLoggerMetaFactory } from '../../../service-shared/logger';
import JobManagerClient from './JobManagerClient';

export async function handleMessageForImageExtraction(
    messageCenter: MessageCenter,
    message: RabbitMqMessage<ImageData>,
    source: ampq.ConsumeMessage,
) {
    const makeLogId = getLoggerMetaFactory('handleMessageForImageExtraction');
    const corrId = source.properties.headers?.['x-correlation-id'];
    const jweToken = source.properties.headers?.authorization;
    const { jobId, message: imageData } = message;
    if (!corrId || !jweToken) {
        logger.error(`bad request via rabbitMq for job: ${jobId}`, makeLogId(''));
        messageCenter.sendExifDataToJobManager(
            jobId,
            imageData.md5,
            imageData.source,
            {},
            corrId,
            jweToken,
            ['bad message format'],
        );
        return;
    }
    const logId = makeLogId('', corrId);

    try {
        const sourceFile = imageData.source;
        const binaryData = await JobManagerClient.getImageData(sourceFile, corrId, jweToken);
        if (!binaryData) throw new Error('failed to stream image data');
        const exifData = await exifr.parse(binaryData);
        if (!exifData) throw new Error('failed to extract exif data');
        messageCenter.sendExifDataToJobManager(
            jobId,
            imageData.md5,
            imageData.source,
            exifData,
            corrId,
            jweToken,
            [],
        );
        logger.info(
            `extracted exif data for image: ${sourceFile} with md5: ${imageData.md5} on job: ${jobId}`,
            logId,
        );
    } catch (error) {
        logger.error(`error extracting exif data for image: ${imageData.source}`, logId);
        messageCenter.sendExifDataToJobManager(
            jobId,
            imageData.md5,
            imageData.source,
            {},
            corrId,
            jweToken,
            [`error processing image ${error}`],
        );
    }
}
