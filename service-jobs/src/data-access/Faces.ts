import * as ampq from 'amqplib';
import { Image } from '../generated/prisma';
import logger, { getLoggerMetaFactory } from '../../../service-shared/logger';
import prisma from '../prisma/client';
import { RabbitMqMessageReceiver } from '../../../service-shared/rabbitMq';

export async function countNumberOfTasksForFaceProcessing(jobId: string): Promise<number> {
    try {
        const count = await prisma.image.count({
            where: { jobIds: { has: jobId }, faces: { none: {} } },
        });
        return count;
    } catch (error) {
        logger.error(`Error counting tasks for face detection: ${error}`, {
            id: 'countNumberOfTasksForFaceProcessing',
        });
        return 0;
    }
}

export async function streamImageDataForFaceProcessing(
    jobId: string,
    bacthSize: number,
    callback: (image: Image) => Promise<void> | void,
) {
    let lastCursor: string | null = null;
    logger.debug(`Streaming images without face data for job: ${jobId} in batches: ${bacthSize}`, {
        id: 'streamDataForProcessing/faces',
    });
    try {
        let counter = 0;
        while (true) {
            const images: Image[] = await prisma.image.findMany({
                where: { jobIds: { has: jobId }, faces: { none: {} } },
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
            `Streamed ${counter} images without face data for processing on job: %streamDataForProcessing ${jobId}`,
            { id: 'streamDataForProcessing/faces' },
        );
    } catch (error) {
        logger.error(`failed to stream image data from DB for exhif ${error}, job: ${jobId}`, {
            id: 'streamDataForProcessing/faces',
        });
    }
}

type FaceData = {
    md5: string;
    hash: string;
    coordX: number;
    coordY: number;
    width: number;
    height: number;
};
let store: FaceData[] = [];
let messages: ampq.ConsumeMessage[] = [];
let ref: NodeJS.Timeout | undefined = undefined;

export function addFaceDataFromProcessing(
    md5: string,
    data: any,
    corrId: string,
    message: ampq.ConsumeMessage,
    receiver: RabbitMqMessageReceiver,
) {
    const logId = getLoggerMetaFactory('addFaceDataFromProcessing')(corrId);
    try {
        const faces = data as any[];
        if (
            faces === undefined ||
            faces === null ||
            !faces ||
            !Array.isArray(faces) ||
            faces.length === 0
        ) {
            logger.warn(`received no usable face data for ${md5} - ${data}`, logId);
            receiver.acknowledgeMessageReceipt(message);
            return;
        }
        faces.forEach((faceDetails) => store.push({ ...faceDetails, md5 } as FaceData));
        messages.push(message);
        logger.debug(`stored ${faces.length} faces for DB`);
    } catch (error) {
        logger.error(`failed to store data for face: ${md5}, ${error}`, logId);
        // acknowledge message as could cause error loop
        if (messages.includes(message)) {
            const index = messages.indexOf(message);
            messages.splice(index, 1);
        }
        try {
            receiver.acknowledgeMessageReceipt(message);
        } catch (e) {
            logger.error(`unable to acknowledge faulty message ${error}`, logId);
        }
        return;
    }
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
            await prisma.face.createMany({ data });
            logger.info(`Added ${data.length} face data records`, logId);
            // now we have stored the data, we can acknowledge messages have been processed from queue
            if (!receiver.isConnected()) await receiver.connect();
            const promises = messagesToAcknowledge.map((m) =>
                receiver.acknowledgeMessageReceipt(m),
            );
            await Promise.all(promises);
        } catch (error) {
            logger.error(`failed to cache face data: ${error}`, logId);

            const isTransient =
                error?.code === 'P1001' /* Prisma: DB unreachable */ ||
                error?.code === 'ETIMEDOUT' ||
                error?.message?.includes('timeout');

            // requeue message as storage failed --- not the message if isTransiant
            if (!receiver.isConnected()) await receiver.connect();
            const promises = messagesToAcknowledge.map((m) =>
                receiver.rejectFailedMessage(m, isTransient),
            );
            await Promise.all(promises);
        }
    }, 1000);
}
