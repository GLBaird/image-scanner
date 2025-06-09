import logger from '../logger';
import prisma from '../prisma/client';

export type ImageData = {
    filename: string;
    mimetype: string;
    filesize: number;
    width: number;
    height: number;
    format: string;
    colorspace: string;
    resolution: string;
    depth: number;
    source: string;
    createdAt: Date;
    md5: string;
    sha1: string;
};

/**
 * Check if image exists on DB and ensure it has this jobId on it's record if so
 * @param jobId
 * @param md5
 * @returns boolean indicating if image was on system and has been updated with new jobId
 */
export async function checkIfImageExistsAndAddJob(jobId: string, md5: string): Promise<boolean> {
    const image = await prisma.image.findUnique({ where: { md5 } });
    if (!image) return false;
    if (image.jobIds.includes(jobId)) return true;
    await prisma.image.update({ where: { md5 }, data: { jobIds: { push: jobId } } });
    return true;
}

let pending: { jobId: string; data: ImageData }[] = [];
let ref: NodeJS.Timeout | undefined = undefined;
/**
 * add new image for job, ensure the image does not already exist on system, otherwise will throw an error
 * due to duplicate md5 or sha1 hash. Will batch process images every 1 second until no images pending.
 * @param jobId
 * @param data
 * @returns
 */
export async function addImageDataForJob(jobId: string, data: ImageData): Promise<void> {
    pending.push({ jobId, data });
    if (!ref) {
        ref = setInterval(async () => {
            console.log('checking');
            if (pending.length === 0) {
                clearInterval(ref);
                ref = undefined;
                return;
            }
            const newImages = pending;
            pending = [];
            const result = await prisma.image.createMany({
                data: newImages.map((i) => ({ ...i.data, jobIds: { set: [i.jobId] } })),
            });
            logger.info(`created ${result.count} images for job: ${jobId}`, {
                id: 'addImagesForJob',
            });
        }, 1000);
    }
}

/**
 * Used to gather stats for images on DB for a job
 * @param jobId
 * @returns
 */
export async function getImageStatsForJob(jobId: string): Promise<{ pngs: number; jpegs: number }> {
    const jpegs = await prisma.image.count({
        where: { jobIds: { has: jobId }, mimetype: { equals: 'image/jpeg ' } },
    });
    const pngs = await prisma.image.count({
        where: { jobIds: { has: jobId }, mimetype: { equals: 'image/png ' } },
    });
    return { jpegs, pngs };
}
