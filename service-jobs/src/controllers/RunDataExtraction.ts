import ProgressStore from '../data-access/ProgressStore';
import config from '../configs/server';
import StageDataHandler, { StageHandler } from '../configs/stages_data';
import { Image } from '../generated/prisma';
import { RabbitMqMessageReceiver, RabbitMqMessageSender } from '../../../service-shared/rabbitMq';
import sharedConfig from '../../../service-shared/configs/config';
import logger, { getLoggerMetaFactory } from '../../../service-shared/logger';
import { updateJobProgress } from '../data-access/Job';

export default async function runDataExtraction(jobId: string, corrId: string, jweToken: string) {
    const pStore = ProgressStore.get();
    const logId = { id: 'runDataExtraction' };

    const stages = config.dataExtractionStages;

    const promises = stages.map(async ({ name, queueName }) => {
        const stageHandler = StageDataHandler[queueName] as StageHandler;
        const taskCount = await stageHandler.count(jobId, corrId);
        pStore.startNewStage(jobId, name, taskCount);
        const messageCenter = new RabbitMqMessageSender(queueName);
        logger.info(
            `starting to stream messages for stage: ${name} to: ${queueName} for job: ${jobId}`,
            logId,
        );
        await stageHandler.streamImagesForProcessing(
            jobId,
            corrId,
            async (image: Image) => {
                try {
                    await messageCenter.sendJsonMessage<Image>(
                        queueName,
                        image,
                        image.source,
                        image.md5,
                        jobId,
                        corrId,
                        jweToken,
                    );
                } catch (err) {
                    logger.error(`failed to send message to: ${queueName} for job: ${jobId}`);
                    pStore.registerStageError(
                        jobId,
                        name,
                        `failed to send message to queue: ${err.message ?? err} for file: ${
                            image.source
                        }`,
                    );
                    pStore.updateForStage(jobId, name, image.source);
                }
            },
            config.batchSizeStreaming,
        );
        logger.info(
            `completerd sending messages for stage: ${name} to queue: ${queueName} for jobId: ${jobId}`,
            logId,
        );
        await messageCenter.close();
    });
    try {
        await Promise.all(promises);
    } catch (error) {
        logger.error(`error waiting for running stage data to rabbitmq: ${error}`, logId);
    }
}

let receiver: RabbitMqMessageReceiver | undefined;

export async function listenForDataExtractionUpdates() {
    if (receiver !== undefined) return;
    receiver = new RabbitMqMessageReceiver(sharedConfig.rabbitMq.serviceQueueName!);
    receiver.getMessagesOnQueue(async (data, message) => {
        const { jobId, errors, from: stage, md5, filepath } = data;
        const corrId = message.properties.headers?.['x-correlation-id'];
        const logId = getLoggerMetaFactory('RunDataExtractions')(
            'listenForDataExtractionUpdates',
            corrId,
        );
        const hasErrors = errors.length > 0;
        const pStore = ProgressStore.get();
        if (hasErrors) {
            logger.error(
                `errors received from ${stage} for job ${jobId}: ${errors.join(', ')}`,
                logId,
            );
            errors.forEach((e) => pStore.registerStageError(jobId, stage, e));
        }
        logger.debug(`receiving info for ${jobId} on image: ${filepath}`);
        const stageHandler = StageDataHandler[stage] as StageHandler;
        if (receiver !== undefined)
            stageHandler.addDataToStore({ corrId, md5, data: data.message, message, receiver });
        const stageName = config.dataExtractionStages.find((des) => des.queueName === stage)?.name;
        if (!stageName) return;
        const completed = pStore.updateForStage(jobId, stageName, filepath);
        if (completed) {
            logger.info(`all tasks completed for job: ${jobId}`, logId);
            await updateJobProgress(jobId, false, true);
        }
    });
}
