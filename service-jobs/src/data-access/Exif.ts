import { Image } from '../generated/prisma';
import logger, { getLoggerMetaFactory } from '../../../service-shared/logger';
import prisma from '../prisma/client';

export async function countNumberOfTasksForExifProcessing(jobId: string): Promise<number> {
    try {
        const count = await prisma.image.count({
            where: { jobIds: { has: jobId }, exifData: null },
        });
        return count;
    } catch (error) {
        logger.error(`Error counting tasks for exif extractrion: ${error}`, {
            id: 'countNumberOfTasksForExifProcessing',
        });
        return 0;
    }
}

export async function streamImageDataForExifProcessing(
    jobId: string,
    bacthSize: number,
    callback: (image: Image) => Promise<void> | void,
) {
    let lastCursor: string | null = null;
    logger.debug(`Streaming images without exif data for job: ${jobId} in batches: ${bacthSize}`, {
        id: 'streamDataForProcessing/exif',
    });
    try {
        let counter = 0;
        while (true) {
            const images: Image[] = await prisma.image.findMany({
                where: { jobIds: { has: jobId }, exifData: null },
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
            `Streamed ${counter} images without exif data for processing on job: %streamDataForProcessing ${jobId}`,
            { id: 'streamDataForProcessing/exif' },
        );
    } catch (error) {
        logger.error(`failed to stream image data from DB for exif ${error}, job: ${jobId}`, {
            id: 'streamDataForProcessing/exif',
        });
    }
}

let store: { md5: string; exif: string }[] = [];
let ref: NodeJS.Timeout | undefined = undefined;

export function addExifDataFromProcessing(md5: string, data: any, corrId: string) {
    const logId = getLoggerMetaFactory('addExifDataFromProcessing')(corrId);
    try {
        store.push({ md5, exif: JSON.stringify(data) });
    } catch (error) {
        logger.error(`Error stringifying json: ${error}`, logId);
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
            await prisma.exifData.createMany({ data });
            logger.info(`Added ${data.length} exif data records`, logId);
        } catch (error) {
            logger.error(`failed to cache exif data: ${error}`, logId);
        }
    }, 1000);
}
