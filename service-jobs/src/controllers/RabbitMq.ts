import * as ampq from 'amqplib';
import logger, { getLoggerMetaFactory } from '../logger';
import config from '../configs/server';

const makeLoggerId = getLoggerMetaFactory('RabbitMQConnection');
const connInfo = { ...config.rabbitMq.connectSettings };
const originQueueName = config.rabbitMq.serviceQueueName;

export type RabbitMqMessage<T> = {
    from: string;
    to: string;
    time: string;
    jobId: string;
    message: T;
};

export class RabbitMqConnection {
    connection?: ampq.ChannelModel;
    channel?: ampq.Channel;
    queueName: string;
    durable: boolean;

    constructor(queueName: string, durable: boolean = true) {
        this.queueName = queueName;
        this.durable = durable;
    }

    async connect() {
        const logId = makeLoggerId('connect');
        if (this.connection && this.channel) return;
        logger.info(
            `connecting to RabbitMQ Channel: ${connInfo.hostname}: ${connInfo.port} for queue: ${this.queueName}`,
            logId,
        );
        this.connection = await ampq.connect(connInfo);
        this.channel = await this.connection.createChannel();
        await this.channel.assertQueue(this.queueName, { durable: this.durable });
        logger.info('RabbitMQ Connection Established', logId);
    }

    isConnected(): boolean {
        return !!this.connection && !!this.channel;
    }

    async close() {
        logger.info(
            `closing connection to RabbitMQ on ${connInfo.hostname}:${connInfo.port} with queue: ${this.queueName}`,
        );
        await this.channel?.close();
        await this.connection?.close();
        this.channel = undefined;
        this.connection = undefined;
    }
}

export class RabbitMqConnectionManager {
    protected connection: RabbitMqConnection;
    protected queueName: string;

    constructor(queueName: string, durable: boolean = true) {
        this.queueName = queueName;
        this.connection = new RabbitMqConnection(queueName, durable);
    }

    getQueueName() {
        return this.queueName;
    }

    isConnected() {
        return this.connection?.isConnected() ?? false;
    }

    async close() {
        await this.connection?.close();
    }
}

export class RabbitMqMessageSender extends RabbitMqConnectionManager {
    async sendJsonMessage<T>(
        queueName: string,
        message: T,
        jobId: string = '',
        corrId: string = '',
        jweToken: string = '',
        persistent: boolean = true,
    ) {
        if (!this.connection.isConnected()) {
            await this.connection.connect();
        }
        const messageToSend: RabbitMqMessage<T> = {
            from: originQueueName,
            to: queueName,
            jobId,
            time: new Date().toISOString(),
            message,
        };
        const jsonBuffer = Buffer.from(JSON.stringify(messageToSend));
        this.connection.channel!.sendToQueue(queueName, jsonBuffer, {
            persistent,
            headers: {
                'x-correlation-id': corrId,
                authorization: `Bearer ${jweToken}`,
            },
        });
    }
}

export class RabbitMqMessageReceiver extends RabbitMqConnectionManager {
    private autoAcknowledge: boolean;

    constructor(queueName: string, durable: boolean = true, autoAcknowledge: boolean = false) {
        super(queueName, durable);
        this.autoAcknowledge = autoAcknowledge;
    }

    async getMessagesOnQueue<T>(
        callback: (message: RabbitMqMessage<T>, messageSource: ampq.ConsumeMessage) => void,
    ) {
        if (!this.connection.isConnected()) {
            await this.connection.connect();
        }
        const logId = {
            id: 'RabbitMQMessageReceiver/getMessagesOnQueue',
        };
        this.connection.channel!.consume(this.queueName, (message) => {
            if (message === null) return;
            logger.info(`message received on queue: ${this.queueName}`, logId);
            const parsedMessage: RabbitMqMessage<T> = JSON.parse(message.content.toString());
            callback(parsedMessage, message);
            if (this.autoAcknowledge && this.connection.isConnected()) {
                logger.debug(
                    `auto acknowledging message ${parsedMessage.to} / ${parsedMessage.from}`,
                    logId,
                );
                this.connection.channel!.ack(message);
            }
        });
    }

    async acknowledgeMessageReceipt(message: ampq.ConsumeMessage) {
        if (!this.isConnected()) await this.connection.connect();
        this.connection.channel!.ack(message);
        logger.debug(
            `message ${message.fields.consumerTag}/${message.fields.deliveryTag} acknowledged`,
            { id: 'RabbitMQMessageReceiver/acknowledgeMessageReceipt' },
        );
    }
}
