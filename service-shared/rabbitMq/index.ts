import * as ampq from 'amqplib';
import logger, { getLoggerMetaFactory } from '../logger';
import config from '../configs/config';

const makeLoggerId = getLoggerMetaFactory('RabbitMQConnection');
const connInfo = { ...config.rabbitMq.connectSettings };
const originQueueName = config.rabbitMq.serviceQueueName;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type RabbitMqMessage<T> = {
    from: string;
    to: string;
    time: string;
    jobId: string;
    errors: string[];
    filepath: string;
    md5: string;
    message: T;
};

export class RabbitMqConnection {
    connection?: ampq.ChannelModel;
    private connectingPromise?: Promise<void>;
    channel?: ampq.Channel;
    queueName: string;
    durable: boolean;
    connectionAttempts = 0;
    MAX_CONNECTION_ATTEMPTS = 10;
    TIME_BETWEEN_CONNECTION_ATTEMPTS = 2000; // 2s

    constructor(queueName: string, durable: boolean = true) {
        this.queueName = queueName;
        this.durable = durable;
    }

    async connect() {
        const logId = makeLoggerId('connect');
        if (this.connection && this.channel) return;
        if (this.connectingPromise) return this.connectingPromise;
        logger.info(
            `connecting to RabbitMQ Channel: ${connInfo.hostname}: ${connInfo.port} for queue: ${this.queueName}`,
            logId,
        );
        this.connectingPromise = (async () => {
            while (this.connectionAttempts < this.MAX_CONNECTION_ATTEMPTS) {
                this.connectionAttempts += 1;
                logger.info(`RabbitMQ connection attempt: ${this.connectionAttempts}/${this.MAX_CONNECTION_ATTEMPTS}`);
                try {
                    const conn = await ampq.connect(connInfo);
                    const ch = await conn.createChannel();
                    await ch.prefetch(config.rabbitMq.prefectLimit);
                    await ch.assertQueue(this.queueName, { durable: this.durable });

                    this.connection = conn;
                    this.channel = ch;
                    logger.info('RabbitMQ connection established', logId);
                    this.connectionAttempts = 0;
                    return;
                } catch (error) {
                    logger.error(`failed to connect to RabbitMQ: ${error.message}`);
                    if (this.connectionAttempts >= this.MAX_CONNECTION_ATTEMPTS) {
                        logger.error('exceeded max connection attempts with RabbitMQ - aborting service.');
                        process.exit(1);
                    }
                    logger.info(
                        `waiting ${
                            this.TIME_BETWEEN_CONNECTION_ATTEMPTS / 1000
                        } seconds before attempting to connect again to RabbitMQ`,
                    );
                    await sleep(this.TIME_BETWEEN_CONNECTION_ATTEMPTS);
                }
            }
        })();
        await this.connectingPromise;
        this.connectingPromise = undefined;
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
        filepath: string,
        md5: string,
        jobId: string = '',
        corrId: string = '',
        jweToken: string = '',
        errors: string[] = [],
        persistent: boolean = true,
    ) {
        if (!this.connection.isConnected()) {
            await this.connection.connect();
        }
        const messageToSend: RabbitMqMessage<T> = {
            from: originQueueName!,
            to: queueName,
            filepath,
            md5,
            jobId,
            time: new Date().toISOString(),
            errors,
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

    async getMessagesOnQueue<T>(callback: (message: RabbitMqMessage<T>, messageSource: ampq.ConsumeMessage) => void) {
        if (!this.connection.isConnected()) {
            await this.connection.connect();
        }
        const logId = {
            id: 'RabbitMQMessageReceiver/getMessagesOnQueue',
        };
        await this.connection.channel!.consume(this.queueName, (message) => {
            if (message === null) return;
            logger.info(`message received on queue: ${this.queueName}`, logId);
            try {
                const parsedMessage: RabbitMqMessage<T> = JSON.parse(message.content.toString());
                callback(parsedMessage, message);
                if (this.autoAcknowledge && this.connection.isConnected()) {
                    logger.debug(`auto acknowledging message ${parsedMessage.to} / ${parsedMessage.from}`, logId);
                    this.connection.channel!.ack(message);
                }
            } catch (error) {
                logger.error(`error attempting to unpak message: ${error}`, logId);
                this.connection.channel?.ack(message);
            }
        });
    }

    async acknowledgeMessageReceipt(message: ampq.ConsumeMessage) {
        if (!this.isConnected()) await this.connection.connect();
        this.connection.channel!.ack(message);
        logger.debug(`message ${message.fields.consumerTag}/${message.fields.deliveryTag} acknowledged`, {
            id: 'RabbitMQMessageReceiver/acknowledgeMessageReceipt',
        });
    }
}
