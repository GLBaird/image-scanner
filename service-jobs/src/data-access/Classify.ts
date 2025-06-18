import * as ampq from 'amqplib';
import { Image } from '../generated/prisma';
import logger, { getLoggerMetaFactory } from '../../../service-shared/logger';
import prisma from '../prisma/client';
import { RabbitMqMessageReceiver } from '../../../service-shared/rabbitMq';

export async function countNumberOfTasksForClassificationProcessing(
    jobId: string,
): Promise<number> {
    try {
        const count = await prisma.image.count({
            where: { jobIds: { has: jobId }, classification: null },
        });
        return count;
    } catch (error) {
        logger.error(`Error counting tasks for classification: ${error}`, {
            id: 'countNumberOfTasksForClassificationProcessing',
        });
        return 0;
    }
}

export async function streamImageDataForClassificationProcessing(
    jobId: string,
    bacthSize: number,
    callback: (image: Image) => Promise<void> | void,
) {
    let lastCursor: string | null = null;
    logger.debug(
        `Streaming images without classification data for job: ${jobId} in batches: ${bacthSize}`,
        {
            id: 'streamDataForProcessing/classify',
        },
    );
    try {
        let counter = 0;
        while (true) {
            const images: Image[] = await prisma.image.findMany({
                where: { jobIds: { has: jobId }, classification: null },
                orderBy: { createdAt: 'asc' },
                take: bacthSize,
                ...(lastCursor !== null && { cursor: { id: lastCursor }, skip: 1 }),
            });

            if (images.length === 0) break;

            counter += images.length;

            const promises = images
                .map((image) => callback(image))
                .filter((item) => item instanceof Promise);

            await Promise.all(promises);

            lastCursor = images.pop()!.id;
        }
        logger.debug(
            `Streamed ${counter} images without classification data for processing on job: %streamDataForProcessing ${jobId}`,
            { id: 'streamDataForProcessing/classify' },
        );
    } catch (error) {
        logger.error(
            `failed to stream image data from DB for classification ${error}, job: ${jobId}`,
            {
                id: 'streamDataForProcessing/classify',
            },
        );
    }
}

let store: { md5: string; tags: string[] }[] = [];
let messages: ampq.ConsumeMessage[] = [];
let ref: NodeJS.Timeout | undefined = undefined;

export function addClassifyDataFromProcessing(
    md5: string,
    data: any,
    corrId: string,
    message: ampq.ConsumeMessage,
    receiver: RabbitMqMessageReceiver,
) {
    const logId = getLoggerMetaFactory('addClassifyDataFromProcessing')(corrId);
    store.push({ md5, ...data });
    messages.push(message);
    if (ref) return;
    ref = setInterval(async () => {
        if (store.length === 0) {
            clearInterval(ref);
            ref = undefined;
            return;
        }
        const data = store;
        store = [];
        const messagesToAcknowledge = messages;
        messages = [];
        try {
            await prisma.classification.createMany({ data });
            logger.info(`Added ${data.length} classification data records`, logId);
            // now we have stored the data, we can acknowledge messages have been processed from queue
            messagesToAcknowledge.forEach((m) => receiver.acknowledgeMessageReceipt(m));
        } catch (error) {
            logger.error(`failed to cache classification data: ${error}`, logId);
        }
    }, 1000);
}
