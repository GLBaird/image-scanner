import { sendUnaryData, status } from '@grpc/grpc-js';
import * as path from 'path';
import { StartScanningJobRequest } from '../generated/jobmanager/StartScanningJobRequest';
import { StartScanningJobResponse } from '../generated/jobmanager/StartScanningJobResponse';
import logger, { getLoggerMetaFactory } from '../logger';
import ServiceError from '../utils/ServiceError';
import ProgressStore from '../data-access/ProgressStore';
import { updateJobProgress } from '../data-access/Job';
import SourceController from './SourceController';
import { getMimeTypeWithFallback } from '../utils/get-mimetype';
import runDataExtraction from './RunDataExtraction';
import getHashes from '../utils/get-file-hashes';
import getImageDetails from '../utils/get-image-details';
import {
    addImageDataForJob,
    checkIfImageExistsAndAddJob,
    getImageStatsForJob,
} from '../data-access/Image';

export default async function runScanJob(
    request: StartScanningJobRequest,
    callback: sendUnaryData<StartScanningJobResponse>,
    corrId: string,
) {
    const logId = getLoggerMetaFactory('runScanJob')('', corrId);
    if (!request.id) {
        logger.error(`failed to start scanner job, no job id provided`, logId);
        return callback(new ServiceError('bad request', status.CANCELLED));
    }

    const jobId = request.id;
    // register job with progress store for UI updates
    const pStore = ProgressStore.get();
    pStore.startJob(jobId);

    // get job details
    const job = await updateJobProgress(jobId, true);
    if (!job) {
        logger.error(`failed to find job for id: ${jobId}, file scan aborted`, logId);
        return callback(new ServiceError('job not found', status.NOT_FOUND));
    }

    const { source } = job;

    // start file scanner and send state to user
    const state = await SourceController.scanSource(source, 30, async (info, completed) => {
        if (completed) {
            pStore.completeFileScan(jobId);
            const { jpegs, pngs } = await getImageStatsForJob(jobId);
            await updateJobProgress(jobId, true, true, { jpegs, pngs });

            // hand over to extracting data with the different stages
            await runDataExtraction(jobId);
        }
        if (typeof info === 'string') {
            pStore.registerFileScanError(jobId, info);
            return;
        }
        if (info === undefined) return;

        const filepath = path.join(SourceController.sourcePath(), info.pathname);

        // get mimetype to check if image (valid images may lack file extension)
        const mimetype = await getMimeTypeWithFallback(filepath);
        const type = mimetype === 'image/jpeg' ? 'jpeg' : mimetype === 'image/png' ? 'png' : 'any';
        pStore.updateForFileScan(jobId, { filepath: info.pathname, type });

        if (type === 'any') return;

        try {
            const { md5, sha1 } = await getHashes(filepath);

            // check if image already exists on DB and add job to image
            const exists = await checkIfImageExistsAndAddJob(jobId, md5);
            if (exists) {
                logger.debug(
                    `image already exists, job added for md5: ${md5} - jobId: ${jobId}`,
                    logId,
                );
                return;
            }

            const {
                width,
                height,
                colorspace,
                depth,
                resolution,
                format,
                error: detailsErrror,
            } = await getImageDetails(filepath);
            if (detailsErrror) {
                pStore.registerFileScanError(
                    jobId,
                    `failed to extract any image data for ${info.pathname}`,
                );
            }

            await addImageDataForJob(jobId, {
                filename: info.filename,
                source: info.pathname,
                filesize: parseFloat(info.size) ?? 0,
                createdAt: info.creationDate,
                width,
                height,
                mimetype,
                resolution,
                format,
                colorspace,
                depth,
                md5,
                sha1,
            });

            logger.debug(`image created for job ${jobId}`, logId);
        } catch (error) {
            logger.error(
                `error during data extraction and storing for file ${info.pathname} on job: ${jobId}. ${error}`,
                logId,
            );
            pStore.registerFileScanError(
                jobId,
                `error processing ${info.pathname}: ${(error as Error)?.message ?? error}`,
            );
        }
    });

    // send state back to user
    callback(null, { state });
}
