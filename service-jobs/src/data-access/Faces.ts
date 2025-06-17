import { Image } from '../generated/prisma';
import logger, { getLoggerMetaFactory } from '../../../service-shared/logger';
import prisma from '../prisma/client';

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
let ref: NodeJS.Timeout | undefined = undefined;

export function addFaceDataFromProcessing(md5: string, data: any, corrId: string) {
    const logId = getLoggerMetaFactory('addFaceDataFromProcessing')(corrId);
    try {
        const faceData: FaceData = { md5, ...data };
        store.push(faceData);
    } catch (error) {
        logger.error(`failed to store data for face: ${md5}, ${error}`, logId);
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
        try {
            await prisma.face.createMany({ data });
            logger.info(`Added ${data.length} face data records`, logId);
        } catch (error) {
            logger.error(`failed to cache face data: ${error}`, logId);
        }
    }, 1000);
}
