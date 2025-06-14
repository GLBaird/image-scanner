'use server';

import { revalidateTag } from 'next/cache';
import { cache } from 'react';
import CacheTags from '@/lib/cache-tags';
import { auth } from '@/auth';
import { getCorrId } from '@/lib/corr-id';
import logger from '@/lib/logger';
import JobManagerClient from '@/grpc/JobManagerClient';
import { GetJobsResponse } from '@/generated/jobmanager/GetJobsResponse';
import { fromTimestamp } from '@/lib/timestamp';
import { GetAvailableSourcesResponse } from '@/generated/jobmanager/GetAvailableSourcesResponse';
import { CreateNewJobResponse } from '@/generated/jobmanager/CreateNewJobResponse';
import { createNewJobSchema } from '@/schemas/CreateNewJob';
import { normaliseErrorPath } from '@/lib/utils';

export type Job = {
    id: string;
    name: string;
    description: string;
    source: string;
    images: number;
    jpeg: number;
    png: number;
    createdAt: Date;
    scanned: boolean;
    inProgress: boolean;
};

// TODO: Remove placeholder content and connect to job service
let jobs: Job[] = [...new Array(30)].map((_, index) => ({
    id: `id_${index}`,
    name: `Sample Job ${index + 1}`,
    description: `Some reason for the existence of sample job ${
        index + 1
    }. Will explain all the stuff important and useful...`,
    source: `/module-${index + 1}`,
    images: Math.floor(Math.random() * 1000),
    jpeg: Math.floor(Math.random() * 800),
    png: Math.floor(Math.random() * 800),
    createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
    scanned: Math.random() > 0.5,
    inProgress: Math.random() > 0.8,
}));

/**
 * Checks for auth session and corrId, and if an array of required value are provide, will check
 * they are not undefined, null or empty strings.
 * @param logId     id needed for logging
 * @param values    array of values to check exist
 * @returns
 */
async function checkForAuthAndErrors(logId: string, values?: unknown[]): Promise<{ errors: string[]; corrId: string }> {
    const session = await auth();
    const corrId = await getCorrId();
    const errors = [];

    if (!session) {
        logger.warn(logId, corrId, 'user not authorised');
        errors.push('User not authorised.');
    }

    if (!corrId) {
        logger.warn(logId, corrId, 'request is missing CorrId');
        errors.push('Request missing correct data.');
    }

    if (values && values.reduce((acc, val) => acc && typeof val !== 'number' && !val, false)) {
        logger.warn(logId, corrId, 'request is missing required data');
        errors.push('bad request, required data is missing.');
    }

    return { errors, corrId };
}

export const getJobs = cache(async (): Promise<{ jobs: Job[]; errors?: string[] }> => {
    const logId = 'actions/manage-jobs/getJobs';
    const { errors, corrId } = await checkForAuthAndErrors(logId);

    logger.info(logId, corrId, 'loading jobs');

    if (errors.length > 0) return { errors, jobs: [] };

    try {
        // load data from gRPC service-jobs
        const client = await JobManagerClient.getClient();
        const metadata = await JobManagerClient.getRequestHeaders();
        const response = await new Promise<GetJobsResponse>((resolve, reject) => {
            client.getAllJobs({ items: 200 }, metadata, (err, resp) => {
                if (err) reject(err);
                if (resp) resolve(resp);
            });
        });

        let errors: string[] = [];
        let jobs: Job[] = [];

        if (response.errors?.values && !response.jobs) {
            logger.error(logId, corrId, `errors loading job from gRPC: ${response.errors.values?.join(', ')}}`);
            errors = response.errors.values.map((e) => e.message ?? `${e}`);
        }

        if (response.jobs?.values) {
            jobs = response.jobs.values.map(
                (j) =>
                    ({
                        ...j,
                        createdAt: fromTimestamp(j.createdAt!),
                    } as Job),
            );
        }

        return { jobs, errors };
    } catch (error) {
        const message = `${(error as Error)?.message ?? error}`;
        logger.error(logId, corrId, 'error loading job data', message);
        return { errors: ['Server error loading jobs.', message], jobs: [] };
    }
});

export const getJobsInProgress = cache(async (): Promise<{ jobs: Job[]; errors?: string[] }> => {
    // TODO: connect to API
    const progressJobs = jobs.filter((j) => j.inProgress && !j.scanned);
    return { jobs: progressJobs };
});

export async function createNewJob(
    data: unknown,
): Promise<{ id?: string; errors: string[] | { field: string; message: string }[] }> {
    const logId = 'actions/manage-jobs/createNewJob';
    const { errors, corrId } = await checkForAuthAndErrors(logId);

    logger.info(logId, corrId, 'creating new job...');

    if (errors.length > 0) return { errors };

    // parse data
    const parsedData = createNewJobSchema.safeParse(data);

    if (!parsedData.success) {
        logger.warn(
            logId,
            corrId,
            'failed to parse new job details:',
            parsedData.error.issues.map((i) => `${i.path}: ${i.message}`).join(','),
        );
        return {
            errors: parsedData.error.issues.map((i) => ({
                field: normaliseErrorPath(i.path, ['email', 'password']),
                message: i.message,
            })),
        };
    }

    try {
        // create job using gRPC service-jobs
        const client = await JobManagerClient.getClient();
        const metadata = await JobManagerClient.getRequestHeaders();
        const response = await new Promise<CreateNewJobResponse>((resolve, reject) => {
            client.createNewJob(parsedData.data, metadata, (err, resp) => {
                if (err) reject(err);
                if (resp) resolve(resp);
            });
        });

        let errors: string[] | { field: string; message: string } = [];
        let id: string | undefined = 'new';

        if (response.errors?.values) {
            logger.error(logId, corrId, `errors creating new job from gRPC: ${response.errors.values?.join(', ')}}`);
            errors = response.errors.values.map((e) => `${e.code ?? 0} - ${e.message ?? 'unknown error'}`);
        }

        if (!response.id) {
            logger.error(logId, corrId, 'failed to create new job, no id returned from service');
            errors.push('Could not create job');
        } else {
            // id = response.id;
            logger.info(logId, corrId, 'created new job with id:', id);
        }

        revalidateTag(CacheTags.jobs);
        revalidateTag(CacheTags.progress);

        return { id, errors };
    } catch (error) {
        const message = `${(error as Error)?.message ?? error}`;
        logger.error(logId, corrId, 'error creating new job', message);
        return { errors: ['Server error creating new job.', message] };
    }
}

export async function getJob(id: string): Promise<{ job?: Job; errors?: string[] }> {
    // TODO: connect to API
    const job = jobs.find((j) => j.id === id);
    return { job, errors: job !== undefined ? ['job not found'] : undefined };
}

export async function deleteJob(id: string): Promise<{ errors?: string[] }> {
    // TODO: connect to API
    const startLength = jobs.length;
    jobs = jobs.filter((j) => j.id !== id);
    revalidateTag(CacheTags.jobs);
    return { errors: jobs.length === startLength ? ['job not found'] : undefined };
}

export async function updateJob(
    id: string,
    update: { name?: string; description?: string },
): Promise<{ errors?: string[] }> {
    // TODO: connect to API
    if (!id || !update || (!update.name && !update.description)) return { errors: ['missing update data'] };
    const job = jobs.find((j) => j.id === id);
    if (!job) return { errors: ['job not found'] };
    const index = jobs.indexOf(job);
    jobs[index] = {
        ...job,
        ...(update.name !== undefined && { name: update.name }),
        ...(update.description !== undefined && { description: update.description }),
    };
    revalidateTag(CacheTags.jobs);
    return {};
}

export async function startJobScan(id: string): Promise<{ state?: 'in-progress' | 'completed'; errors?: string[] }> {
    // TODO: connect to API
    const job = jobs.find((j) => j.id === id);
    if (!job) return { errors: ['job not found'] };
    const index = jobs.indexOf(job);
    jobs[index] = {
        ...job,
        scanned: false,
        inProgress: true,
    };
    revalidateTag(CacheTags.jobs);
    revalidateTag(CacheTags.progress);
    return { state: 'in-progress' };
}

export async function getScanSources(): Promise<{ sources: string[]; errors?: string[] }> {
    const logId = 'actions/manage-jobs/getScanSources';
    const { errors, corrId } = await checkForAuthAndErrors(logId);

    logger.info(logId, corrId, 'loading scan sources');

    if (errors.length > 0) return { errors, sources: [] };

    try {
        // load data from gRPC service-jobs
        const client = await JobManagerClient.getClient();
        const metadata = await JobManagerClient.getRequestHeaders();
        const response = await new Promise<GetAvailableSourcesResponse>((resolve, reject) => {
            client.getAvailableSources({}, metadata, (err, resp) => {
                if (err) reject(err);
                if (resp) resolve(resp);
            });
        });

        let errors: string[] = [];
        let sources: string[] = [];

        if (response.errors?.values && !response.sources) {
            logger.error(logId, corrId, `errors loading sources from gRPC: ${response.errors.values?.join(', ')}}`);
            errors = response.errors.values.map((e) => e.message ?? `${e}`);
        }

        if (response.sources?.values) {
            sources = response.sources.values.map((j) => j.name ?? 'unknown');
        }

        return { sources, errors };
    } catch (error) {
        const message = `${(error as Error)?.message ?? error}`;
        logger.error(logId, corrId, 'error loading source data', message);
        return { errors: ['Server error loading sources.', message], sources: [] };
    }
}
