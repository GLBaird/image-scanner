import { Metadata } from '@grpc/grpc-js';
import { JobManagerControllerHandlers } from '../generated/jobmanager/JobManagerController';
import logger, { getLoggerMetaFactory } from '../logger';
import ServiceError from '../utils/ServiceError';
import {
    createJob,
    deleteJob,
    getAllJobs,
    getAllJobsInProgress,
} from '../data-access/Job';
import { toTimestamp } from '../utils/timestamp';
import { Job } from '../generated/jobmanager/Job';
import ProgressStore from '../data-access/ProgressStore';
import getCorrId from '../utils/get-correlation-id';

const loggerMeta = getLoggerMetaFactory('JobManagerController');

/**
 * Controller for handling incoming messages via gRPC - based on the PROTO file
 */
const JobManagerController: JobManagerControllerHandlers = {
    createNewJob: async (call, callback) => {
        const { request } = call;
        const corrId = getCorrId(call.metadata);
        const logId = loggerMeta('createNewJob', corrId);

        if (!corrId) {
            logger.info('bad request', logId);
            return callback(new ServiceError('bad request', 400));
        }
        try {
            const id = await createJob(request);
            callback(null, { id });
            logger.info(`created new job: ${id}`, logId);
        } catch (error) {
            logger.error(`error creating new job: ${error}`, logId);
            if (error instanceof ServiceError) {
                callback(error);
            } else {
                callback(new ServiceError(`error creating job: ${error}`, 500));
            }
        }
    },
    getAllJobs: async (call, callback) => {
        const { request } = call;
        const corrId = getCorrId(call.metadata);
        const logId = loggerMeta('getAllJobs', corrId);
        if (!corrId) {
            logger.info('bad request', logId);
            return callback(new ServiceError('bad request', 400));
        }
        try {
            const jobs = (await getAllJobs(request)).map((j) => ({
                ...j,
                createdAt: toTimestamp(j.createdAt),
            })) as Job[];
            callback(null, { jobs: { values: jobs } });
            logger.info('get all jobs', logId);
        } catch (error) {
            logger.error(`error getting jobs: ${error}`, logId);
            if (error instanceof ServiceError) {
                callback(error);
            } else {
                callback(new ServiceError(`error getting jobs: ${error}`, 500));
            }
        }
    },
    getAllJobsInProgress: async (call, callback) => {
        const { request } = call;
        const corrId = getCorrId(call.metadata);
        const logId = loggerMeta('getAllJobsInProgress', corrId);
        if (!corrId) {
            logger.info('bad request', logId);
            return callback(new ServiceError('bad request', 400));
        }
        try {
            const jobs = (await getAllJobsInProgress(request)).map((j) => ({
                ...j,
                createdAt: toTimestamp(j.createdAt),
            })) as Job[];
            callback(null, { jobs: { values: jobs } });
            logger.info('get all jobs in progress', logId);
        } catch (error) {
            logger.error(`error getting jobs in progress: ${error}`, logId);
            if (error instanceof ServiceError) {
                callback(error);
            } else {
                callback(
                    new ServiceError(
                        `error getting jobs in progress: ${error}`,
                        500,
                    ),
                );
            }
        }
    },
    deleteJobAndAllData: async (call, callback) => {
        const { request } = call;
        const corrId = getCorrId(call.metadata);
        const logId = loggerMeta('getAllJobsInProgress', corrId);
        if (!corrId) {
            logger.info('bad request', logId);
            return callback(new ServiceError('bad request', 400));
        }
        try {
            await deleteJob(request);
            callback(null, { success: true });
            logger.info(`delete job and related data: ${request.id}`, logId);
        } catch (error) {
            logger.error(
                `error deleting a job and related data: ${error}`,
                logId,
            );
            if (error instanceof ServiceError) {
                callback(error);
            } else {
                callback(
                    new ServiceError(
                        `error deleting a job and related data: ${error}`,
                        500,
                    ),
                );
            }
        }
    },
    getAvailableSources: async (call, callback) => {
        const { request } = call;
    },
    startScanningJob: async (call, callback) => {
        const { request } = call;
    },
};

export default JobManagerController;
