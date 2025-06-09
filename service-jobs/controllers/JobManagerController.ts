import { JobManagerControllerHandlers } from '../generated/jobmanager/JobManagerController';
import logger, { getLoggerMetaFactory } from '../logger';
import { createJob, deleteJob, getAllJobs, getAllJobsInProgress } from '../data-access/Job';
import { toTimestamp } from '../utils/timestamp';
import { Job } from '../generated/jobmanager/Job';
import { handleServiceError } from '../utils/handle-service-error';
import { handleMissingCorrId } from '../utils/handle-missing-correlation-id';
import SourceController from './SourceController';
import { extractMetaData } from '../utils/extract-meta-data';
import runScanJob from './RunScanJob';
import { getImagesForJob } from '../data-access/Image';
import { Image } from '../generated/jobmanager/Image';

const loggerMeta = getLoggerMetaFactory('JobManagerController');

/**
 * Controller for handling incoming messages via gRPC - based on the PROTO file
 */
const JobManagerController: JobManagerControllerHandlers = {
    createNewJob: async (call, callback) => {
        const { request, corrId, logId } = extractMetaData(call, 'createNewJob', loggerMeta);
        if (!corrId) handleMissingCorrId(callback, logId);
        try {
            const id = await createJob(request);
            callback(null, { id });
            logger.info(`created new job: ${id}`, logId);
        } catch (error) {
            handleServiceError(error, 'creating new jobs', callback, logId);
        }
    },
    getAllJobs: async (call, callback) => {
        const { request, corrId, logId } = extractMetaData(call, 'getAllJobs', loggerMeta);
        if (!corrId) handleMissingCorrId(callback, logId);
        try {
            const jobs = (await getAllJobs(request)).map((j) => ({
                ...j,
                createdAt: toTimestamp(j.createdAt),
            })) as Job[];
            callback(null, { jobs: { values: jobs } });
            logger.info('get all jobs', logId);
        } catch (error) {
            handleServiceError(error, 'getting all jobs', callback, logId);
        }
    },
    getAllJobsInProgress: async (call, callback) => {
        const { request, corrId, logId } = extractMetaData(
            call,
            'getAllJobsInProgress',
            loggerMeta,
        );
        if (!corrId) handleMissingCorrId(callback, logId);
        try {
            const jobs = (await getAllJobsInProgress(request)).map((j) => ({
                ...j,
                createdAt: toTimestamp(j.createdAt),
            })) as Job[];
            callback(null, { jobs: { values: jobs } });
            logger.info('get all jobs in progress', logId);
        } catch (error) {
            handleServiceError(error, 'getting jobs in progress', callback, logId);
        }
    },
    deleteJobAndAllData: async (call, callback) => {
        const { request, corrId, logId } = extractMetaData(call, 'deleteJobAndAllData', loggerMeta);
        if (!corrId) handleMissingCorrId(callback, logId);
        try {
            await deleteJob(request);
            callback(null, { success: true });
            logger.info(`delete job and related data: ${request.id}`, logId);
        } catch (error) {
            handleServiceError(error, 'deleting a job and related data', callback, logId);
        }
    },
    getAvailableSources: async (call, callback) => {
        const { corrId, logId } = extractMetaData(call, 'getAvailableSources', loggerMeta);
        if (!corrId) handleMissingCorrId(callback, logId);
        try {
            const sources = await SourceController.getSources();
            callback(null, { sources: { values: sources } });
            logger.info('getting available sources', logId);
        } catch (error) {
            handleServiceError(error, 'getting available sources', callback, logId);
        }
    },
    startScanningJob: async (call, callback) => {
        const { request, corrId, logId } = extractMetaData(call, 'startScanningJob', loggerMeta);
        if (!corrId) handleMissingCorrId(callback, logId);
        try {
            logger.info(`start running scan for job: ${request.id}`, logId);
            await runScanJob(request, callback, corrId!);
        } catch (error) {
            handleServiceError(error, `start scanning for job: ${request.id}`, callback, logId);
        }
    },
    getImages: async (call, callback) => {
        const { request, corrId, logId } = extractMetaData(call, 'getImages', loggerMeta);
        if (!corrId) handleMissingCorrId(callback, logId);
        try {
            logger.info(`get images for job: ${request.jobId}`, logId);
            const images = (await getImagesForJob(request)).map((i) => ({
                ...i,
                createdAt: toTimestamp(i.createdAt),
                exifData: i.exifData?.exif ?? '',
                faces:
                    i.faces?.map((f) => ({
                        hash: f.hash,
                        x: f.coordX,
                        y: f.coordY,
                        width: f.width,
                        height: f.height,
                    })) ?? [],
                tags: i.classification?.tags ?? [],
            })) as Image[];
            callback(null, { images: { values: images } });
        } catch (error) {
            handleServiceError(error, `get images for job: ${request.jobId}`, callback, logId);
        }
    },
};

export default JobManagerController;
