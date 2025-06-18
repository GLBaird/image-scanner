import { status } from '@grpc/grpc-js';
import { GetImagesRequest } from '../generated/jobmanager/GetImagesRequest';
import logger from '../../../service-shared/logger';
import prisma from '../prisma/client';
import ServiceError from '../utils/ServiceError';
import extractPageParamsFromRequest from '../utils/extract-page-params-from-request';
import pause from '../../tests/helpers/pause';

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

export type ExtendedImageData = ImageData & {
    exifData?: { exif: string } | null;
    classification?: { tags: string[] } | null;
    faces?:
        | { hash: string; coordX: number; coordY: number; width: number; height: Number }[]
        | null;
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

let updatesInProgress = false;

export function startUpdates() {
    updatesInProgress = true;
}

type PendingData = { jobId: string; data: ImageData }[];
let pending: PendingData = [];
let ref: NodeJS.Timeout | undefined = undefined;
/**
 * add new image for job, ensure the image does not already exist on system, otherwise will throw an error
 * due to duplicate md5 or sha1 hash. Will batch process images every 1 second until no images pending.
 * @param jobId
 * @param data
 * @returns
 */
export async function addImageDataForJob(jobId: string, data: ImageData): Promise<void> {
    updatesInProgress = true;
    pending.push({ jobId, data });
    if (!ref) {
        ref = setInterval(async () => {
            if (pending.length === 0) {
                clearInterval(ref);
                ref = undefined;
                updatesInProgress = false;
                return;
            }
            const newImages = pending;
            pending = [];
            const md5s: string[] = [];
            const filteredImages: PendingData = [];
            await Promise.all(
                newImages.map(async (image) => {
                    const imageExists = await checkIfImageExistsAndAddJob(
                        image.jobId,
                        image.data.md5,
                    );
                    if (imageExists || md5s.includes(image.data.md5)) return;
                    md5s.push(image.data.md5);
                    filteredImages.push(image);
                }),
            );
            const result = await prisma.image.createMany({
                data: filteredImages.map((i) => ({ ...i.data, jobIds: { set: [i.jobId] } })),
            });
            logger.info(`created ${result.count} images for job: ${jobId}`, {
                id: 'addImagesForJob',
            });
        }, 1000);
    }
}

export async function waitForImageUpdates(jobId: string): Promise<void> {
    while (updatesInProgress) {
        await pause(5000);
    }
}

/**
 * Used to gather stats for images on DB for a job
 * @param jobId
 * @returns
 */
export async function getImageStatsForJob(jobId: string): Promise<{ pngs: number; jpegs: number }> {
    const jpegs = await prisma.image.count({
        where: { jobIds: { has: jobId }, mimetype: { equals: 'image/jpeg' } },
    });
    const pngs = await prisma.image.count({
        where: { jobIds: { has: jobId }, mimetype: { equals: 'image/png ' } },
    });
    return { jpegs, pngs };
}

/**
 * process request to get paged image data for job
 * @param request
 */
export async function getImagesForJob(request: GetImagesRequest): Promise<ExtendedImageData[]> {
    const { jobId } = request;
    if (!jobId) throw new ServiceError('bad request', status.CANCELLED);
    const { items, cursor, order } = extractPageParamsFromRequest(request);
    return await prisma.image.findMany({
        where: { jobIds: { has: jobId } },
        orderBy: { source: order },
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        take: items,
        include: { exifData: true, faces: true, classification: true },
    });
}
