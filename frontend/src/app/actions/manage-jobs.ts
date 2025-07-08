'use server';

import logger from '@/lib/logger';
import JobManagerClient from '@/grpc/JobManagerClient';
import { GetJobsResponse } from '@/generated/jobmanager/GetJobsResponse';
import { fromTimestamp } from '@/lib/timestamp';
import { GetAvailableSourcesResponse } from '@/generated/jobmanager/GetAvailableSourcesResponse';
import { CreateNewJobResponse } from '@/generated/jobmanager/CreateNewJobResponse';
import { createNewJobSchema } from '@/schemas/CreateNewJob';
import { normaliseErrorPath } from '@/lib/utils';
import { DeleteJobResponse } from '@/generated/jobmanager/DeleteJobResponse';
import { StartScanningJobResponse } from '@/generated/jobmanager/StartScanningJobResponse';
import checkForAuthAndErrors from '@/lib/check-for-auth-errors';

export type Job = {
    id: string;
    name: string;
    description: string;
    source: string;
    images: number;
    jpegs: number;
    pngs: number;
    createdAt: Date;
    scanned: boolean;
    inProgress: boolean;
};

async function loadJobsFromDB(name: string, inProgress: boolean = false): Promise<{ jobs: Job[]; errors?: string[] }> {
    const logId = `actions/manage-jobs/${name}`;
    const { errors, corrId } = await checkForAuthAndErrors(logId);

    logger.info(logId, corrId, inProgress ? 'loading jobs in progress' : 'loading jobs');

    if (errors.length > 0) return { errors, jobs: [] };

    try {
        // load data from gRPC service-jobs
        const client = await JobManagerClient.getClient();
        const metadata = await JobManagerClient.getRequestHeaders();
        const response = await new Promise<GetJobsResponse>((resolve, reject) => {
            if (inProgress) {
                client.getAllJobsInProgress({ items: 200 }, metadata, (err, resp) => {
                    if (err) reject(err);
                    if (resp) resolve(resp);
                });
                return;
            }
            client.getAllJobs({ items: 200 }, metadata, (err, resp) => {
                if (err) reject(err);
                if (resp) resolve(resp);
            });
        });

        let errors: string[] = [];
        let jobs: Job[] = [];

        if (response.errors?.values) {
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
}

export const getJobs = async (): Promise<{ jobs: Job[]; errors?: string[] }> => {
    return await loadJobsFromDB('getJobs');
};

export const getJobsInProgress = async (): Promise<{ jobs: Job[]; errors?: string[] }> => {
    return await loadJobsFromDB('getJobsInProgress', true);
};

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
        const id = response.id;

        if (response.errors?.values) {
            logger.error(logId, corrId, `errors creating new job from gRPC: ${response.errors.values?.join(', ')}}`);
            errors = response.errors.values.map((e) => `${e.code ?? 0} - ${e.message ?? 'unknown error'}`);
        }

        if (!id) {
            logger.error(logId, corrId, 'failed to create new job, no id returned from service');
            errors.push('Could not create job');
        } else {
            logger.info(logId, corrId, 'created new job with id:', id);
        }

        return { id, errors };
    } catch (error) {
        const message = `${(error as Error)?.message ?? error}`;
        logger.error(logId, corrId, 'error creating new job', message);
        return { errors: ['Server error creating new job.', message] };
    }
}

export async function deleteJob(id: string): Promise<{ errors?: string[] }> {
    const logId = 'actions/manage-jobs/deleteJob';
    const { errors, corrId } = await checkForAuthAndErrors(logId);

    logger.info(logId, corrId, `deleting job: ${id}`);

    if (errors.length > 0) return { errors };

    try {
        // delete job from gRPC service-jobs
        const client = await JobManagerClient.getClient();
        const metadata = await JobManagerClient.getRequestHeaders();
        const response = await new Promise<DeleteJobResponse>((resolve, reject) => {
            client.deleteJobAndAllData({ id }, metadata, (err, resp) => {
                if (err) reject(err);
                if (resp) resolve(resp);
            });
        });

        let errors: string[] = [];

        if (response.errors?.values) {
            logger.error(logId, corrId, `errors deleting job via gRPC: ${response.errors.values?.join(', ')}}`);
            errors = response.errors.values.map((e) => e.message ?? `${e}`);
        }

        return { errors };
    } catch (error) {
        const message = `${(error as Error)?.message ?? error}`;
        logger.error(logId, corrId, 'error deleting job data', message);
        return { errors: ['Server error deleting jobs.', message] };
    }
}

export async function startJobScan(id: string): Promise<{ state?: 'in-progress' | 'completed'; errors?: string[] }> {
    const logId = 'actions/manage-jobs/startJobScan';
    const { errors, corrId } = await checkForAuthAndErrors(logId);

    logger.info(logId, corrId, `start scan for job: ${id}`);

    if (errors.length > 0) return { errors };

    try {
        // delete job from gRPC service-jobs
        const client = await JobManagerClient.getClient();
        const metadata = await JobManagerClient.getRequestHeaders();
        const response = await new Promise<StartScanningJobResponse>((resolve, reject) => {
            client.startScanningJob({ id }, metadata, (err, resp) => {
                if (err) reject(err);
                if (resp) resolve(resp);
            });
        });

        let errors: string[] = [];
        let state = '';

        if (response.errors?.values) {
            logger.error(logId, corrId, `errors scanning job via gRPC: ${response.errors.values?.join(', ')}}`);
            errors = response.errors.values.map((e) => e.message ?? `${e}`);
        }

        if (response.state) {
            state = response.state;
            logger.debug(logId, corrId, `scanning state ${state} for job: ${id}`);
        }

        return { errors };
    } catch (error) {
        const message = `${(error as Error)?.message ?? error}`;
        logger.error(logId, corrId, 'error scanning job data', message);
        return { errors: ['Server error scanning jobs.', message] };
    }
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
