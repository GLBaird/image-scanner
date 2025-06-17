import * as assert from 'assert';
import {
    RabbitMqConnection,
    RabbitMqMessageReceiver,
    RabbitMqMessageSender,
} from '../src/controllers/RabbitMq';
import config from '../src/configs/server';

describe('will test rabbit mq helpers', function () {
    this.timeout(5000);

    const queue1 = 'tester';
    const queue2 = 'tester-2';
    const jobId = 'test-job-id';
    const corrId = 'test-corr-id';
    const jweToken = 'encrypted-jwt-token';
    const senderId = config.rabbitMq.serviceQueueName;

    const message = 'this is a test message';

    it('should connect and disconnect from rabbitmq', async () => {
        const connection = new RabbitMqConnection(queue1);
        assert(connection);
        assert.equal(connection.isConnected(), false);
        await connection.connect();
        assert(connection.isConnected());
        await connection.close();
        assert.equal(connection.isConnected(), false);
        assert.equal(connection.queueName, queue1);
    });

    it('should send a message with sender', async () => {
        const sender = new RabbitMqMessageSender(queue1);
        assert(sender);
        assert.equal(sender.isConnected(), false);
        await sender.sendJsonMessage(queue1, message, jobId, corrId, jweToken, false);
        assert(sender.isConnected());
        assert.equal(sender.getQueueName(), queue1);
        await sender.close();
        assert.equal(sender.isConnected(), false);
    });

    it('should send message from a to b and include header data in message body', async () => {
        const sender = new RabbitMqMessageSender(queue2);
        const receiver = new RabbitMqMessageReceiver(queue2);
        assert(sender);
        assert(receiver);
        assert.equal(receiver.isConnected(), false);
        assert.equal(sender.getQueueName(), queue2);
        assert.equal(receiver.getQueueName(), queue2);
        await sender.sendJsonMessage(queue2, message, jobId, corrId, jweToken, false);
        assert(sender.isConnected());

        await new Promise<void>(async (resolve, reject) => {
            await receiver.getMessagesOnQueue<string>((messageReceived, messageSource) => {
                assert.equal(messageReceived.from, senderId);
                assert.equal(messageReceived.to, queue2);
                assert.equal(messageReceived.jobId, jobId);
                assert.strictEqual(messageReceived.message, message);
                const today = new Date().toISOString().split('T').shift();
                const messageDate = messageReceived.time.split('T').shift();
                assert.equal(messageDate, today);
                const corrIdFromMessage = messageSource.properties.headers?.['x-correlation-id'];
                const jweTokenFromMessgae = messageSource.properties.headers?.authorization;
                assert.equal(corrIdFromMessage, corrId);
                assert.equal(jweTokenFromMessgae, `Bearer ${jweToken}`);

                receiver.acknowledgeMessageReceipt(messageSource);

                resolve();
            });
        });

        await sender.close();
        await receiver.close();

        assert.equal(sender.isConnected(), false);
        assert.equal(receiver.isConnected(), false);
    });
});
