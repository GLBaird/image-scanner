import prisma from '../prisma/client';
import { CreateNewJobReqest } from '../generated/jobmanager/CreateNewJobReqest';
import ServiceError from '../utils/ServiceError';
import { Job } from '../generated/prisma';
import { GetJobsRequest } from '../generated/jobmanager/GetJobsRequest';
import { Order } from '../generated/jobmanager/Order';
import { DeleteJobRequest } from '../generated/jobmanager/DeleteJobRequest';
import logger from '../logger';

/**
 * Creates new job from request data and returns id
 * @param request
 * @returns id of job created
 */
export async function createJob(request: CreateNewJobReqest): Promise<string> {
    const { name, description, source, userId } = request;
    if (!name || !description || !source || !userId) {
        throw new ServiceError('bad request', 400);
    }
    const job = await prisma.job.create({
        data: {
            name,
            description,
            source,
            userId,
        },
    });

    return job.id;
}

function extractParamsFromGetJobRequest(request: GetJobsRequest): {
    items: number;
    cursor: string;
    order: 'asc' | 'desc';
} {
    const items = typeof request.items === 'number' ? request.items : 200;
    const cursor = request.cursor ?? '';
    const order = request.order === Order.DESC ? 'desc' : 'asc';

    if (items <= 0) {
        throw new ServiceError('bad request', 400);
    }
    if (items > 2000) {
        throw new ServiceError('bad request - batch size too large', 400);
    }
    return { items, cursor, order };
}

/**
 * Returns paged number of jobs using a cursor sorted by creation date
 * @param request
 * @returns
 */
export async function getAllJobs(request: GetJobsRequest): Promise<Job[]> {
    const { cursor, items, order } = extractParamsFromGetJobRequest(request);
    return await prisma.job.findMany({
        orderBy: { createdAt: order },
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        take: items,
    });
}

/**
 * Returns paged number of job ordered by creation date which are marked inProgress and not scanned
 * @param request
 * @returns
 */
export async function getAllJobsInProgress(request: GetJobsRequest): Promise<Job[]> {
    const { cursor, items, order } = extractParamsFromGetJobRequest(request);
    return await prisma.job.findMany({
        where: { inProgress: true, scanned: false },
        orderBy: { createdAt: order },
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        take: items,
    });
}

/**
 * Delete job with given id and cascade to all related data
 * @param request
 */
export async function deleteJob(request: DeleteJobRequest) {
    if (!request.id || typeof request.id !== 'string') {
        throw new ServiceError('bad request', 400);
    }
    const { id } = request;
    await prisma.job.delete({ where: { id } });

    // remove id from all images in DB and remove any "orphaned" images.
    await prisma.$transaction([
        // pull the id out of every array that has it.
        // sadly, prisma only method involves pulling arrays and itterating
        // over them -- which is time consuming in large image collections,
        // so using RAW SQL as the most efficient way.
        prisma.$executeRawUnsafe(
            `
          UPDATE "Image"
          SET    "jobIds" = array_remove("jobIds", $1)
          WHERE  $1 = ANY ("jobIds")
        `,
            id,
        ),

        // delete rows whose array ended up empty
        prisma.image.deleteMany({
            where: { jobIds: { equals: [] } },
        }),
    ]);
}

/**
 * Get job specified with jobId from DB
 * @param jobId
 * @returns
 */
export async function getJob(jobId: string): Promise<Job | null> {
    return await prisma.job.findUnique({ where: { id: jobId } });
}

export type imageInfo = {
    jpegs: number;
    pngs: number;
};

export async function updateJobProgress(
    jobId: string,
    inProgress: boolean,
    scanned: boolean = false,
    info?: imageInfo,
): Promise<Job | null> {
    const data = {
        inProgress,
        scanned,
        ...(info !== undefined && {
            images: info.jpegs + info.pngs,
            jpegs: info.jpegs,
            pngs: info.pngs,
        }),
    };
    try {
        console.log('UPDATE JOB', jobId, data);
        return await prisma.job.update({ where: { id: jobId }, data });
    } catch (err) {
        logger.error(`failed to update job: ${jobId} - ${err}`, { id: 'RunScanJobs' });
        return null;
    }
}
