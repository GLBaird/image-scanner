import * as ampq from 'amqplib';
import {
    RabbitMqMessageSender,
    RabbitMqMessageReceiver,
    RabbitMqMessage,
} from '../../../service-shared/rabbitMq';
import logger from '../../../service-shared/logger';
import config from '../config/server';
import { handleMessageForImageExtraction } from './Workflow';
import ImageData from '../../../service-shared/rabbitMq/types/ImageData';
import ExifData from '../../../service-shared/rabbitMq/types/ExifData';

class MessageCenter {
    private serviceIsRunning = false;
    private sender: RabbitMqMessageSender;
    private receiver: RabbitMqMessageReceiver;

    constructor() {
        logger.info(`Establishing queues for sending: ${config.jobManagerQueue}`, {
            id: 'MessageCenter/constructor',
        });
        this.sender = new RabbitMqMessageSender(config.jobManagerQueue);
        logger.info(`Establishing queues for receiving: ${config.stageInfo.queueName}`, {
            id: 'MessageCenter/constructor',
        });
        this.receiver = new RabbitMqMessageReceiver(config.stageInfo.queueName);
    }

    private async connectToRabbitMq() {
        logger.info('connecting receiver to queue for image data', {
            id: 'MessageCenter/connectToRabbitMq',
        });
        this.receiver.getMessagesOnQueue<ImageData>(this.receiveMessageFromRabbitMq.bind(this));
    }

    private async receiveMessageFromRabbitMq(
        message: RabbitMqMessage<ImageData>,
        source: ampq.ConsumeMessage,
    ) {
        await handleMessageForImageExtraction(this, message, source);
        this.receiver.acknowledgeMessageReceipt(source);
    }

    async sendExifDataToJobManager(
        jobId: string,
        md5: string,
        filepath: string,
        exifData: any,
        corrId: string,
        jweToken: string,
        errors: string[],
    ) {
        const messageData = { md5, exifData };
        await this.sender.sendJsonMessage<ExifData>(
            config.jobManagerQueue,
            messageData,
            filepath,
            md5,
            jobId,
            corrId,
            jweToken,
            errors,
        );
    }

    async startService() {
        this.serviceIsRunning = true;
        await this.connectToRabbitMq();
        while (this.serviceIsRunning) {
            // keep loop open
            await new Promise((res) => setTimeout(res, 10000));
        }
    }

    stopService() {
        this.serviceIsRunning = false;
    }
}

export default MessageCenter;
