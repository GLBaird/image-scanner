import ProgressStore from '../data-access/ProgressStore';
import config from '../configs/server';
import StageDataHandler, { StageHandler } from '../configs/stages_data';
import { Image } from '../generated/prisma';
import { RabbitMqMessageSender } from './RabbitMq';
import logger from '../logger';

export default async function runDataExtraction(jobId: string, corrId: string, jweToken: string) {
    const pStore = ProgressStore.get();

    const stages = config.dataExtractionStages;

    const promises = stages.map(async ({ name, queueName }) => {
        const stageHandler = StageDataHandler[queueName] as StageHandler;
        const taskCount = await stageHandler.count(jobId, corrId);
        pStore.startNewStage(jobId, name, taskCount);
        const messageCenter = new RabbitMqMessageSender(queueName);
        const logId = { id: 'runDataExtraction' };
        logger.info(
            `starting to stream messages for stage: ${name} to: ${queueName} for job: ${jobId}`,
            logId,
        );
        await stageHandler.streamImagesForProcessing(
            jobId,
            corrId,
            async (image: Image) => {
                try {
                    await messageCenter.sendJsonMessage(queueName, image, jobId, corrId, jweToken);
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
        messageCenter.close();
    });

    await Promise.all(promises);
}
