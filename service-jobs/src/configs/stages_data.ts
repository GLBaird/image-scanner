import {
    addClassifyDataFromProcessing,
    countNumberOfTasksForClassificationProcessing,
    streamImageDataForClassificationProcessing,
} from '../data-access/Classify';
import {
    addExifDataFromProcessing,
    countNumberOfTasksForExifProcessing,
    streamImageDataForExifProcessing,
} from '../data-access/Exif';
import {
    addFaceDataFromProcessing,
    countNumberOfTasksForFaceProcessing,
    streamImageDataForFaceProcessing,
} from '../data-access/Faces';
import { Image } from '../generated/prisma';
import logger from '../../../service-shared/logger';

export type ImageCallback = (image: Image) => void;
export type StageHandler = {
    streamImagesForProcessing: (
        jobId: string,
        corrId: string,
        callback: ImageCallback,
        batchSize: number,
    ) => Promise<void>;
    addDataToStore: (md5: string, data: any, corrId: string) => void;
    count: (jobId: string, corrId: string) => Promise<number>;
};

const StageDataHandler = {
    ExifExtractor: {
        async streamImagesForProcessing(
            jobId: string,
            corrId: string,
            callback: ImageCallback,
            batchSize: number,
        ) {
            logger.info(
                `Streaming data for ${jobId} for exif processing in batches of ${batchSize}`,
                { id: 'StageDataHandler/ExifExtractor/stream', corrId },
            );
            await streamImageDataForExifProcessing(jobId, batchSize, callback);
        },
        addDataToStore(md5: string, data: any, corrId: string) {
            logger.debug(`adding data to store for exif for image md5: ${md5}`, {
                id: 'StageDataHandler/ExifExtractor/store',
                corrId,
            });
            addExifDataFromProcessing(md5, data, corrId);
        },
        async count(jobId: string, corrId: string) {
            const count = await countNumberOfTasksForExifProcessing(jobId);
            logger.debug(`Counted ${count} tasks for exif extraction on job: ${jobId}`, {
                id: 'StageDataHandler/ExifExtractor/count',
                corrId,
            });
            return count;
        },
    } as StageHandler,
    Faces: {
        async streamImagesForProcessing(
            jobId: string,
            corrId: string,
            callback: ImageCallback,
            batchSize: number,
        ) {
            logger.info(
                `Streaming data for ${jobId} for face processing in batches of ${batchSize}`,
                { id: 'StageDataHandler/Faces/stream', corrId },
            );
            await streamImageDataForFaceProcessing(jobId, batchSize, callback);
        },
        addDataToStore(md5: string, data: any, corrId: string) {
            logger.debug(`adding data to store for faces for image md5: ${md5}`, {
                id: 'StageDataHandler/Faces/store',
                corrId,
            });
            addFaceDataFromProcessing(md5, data, corrId);
        },
        async count(jobId: string, corrId: string) {
            const count = await countNumberOfTasksForFaceProcessing(jobId);
            logger.debug(`Counted ${count} tasks for face detection on job: ${jobId}`, {
                id: 'StageDataHandler/Faces/count',
                corrId,
            });
            return count;
        },
    } as StageHandler,
    Classifier: {
        async streamImagesForProcessing(
            jobId: string,
            corrId: string,
            callback: ImageCallback,
            batchSize: number,
        ) {
            logger.info(
                `Streaming data for ${jobId} for classification processing in batches of ${batchSize}`,
                { id: 'StageDataHandler/Classifier/stream', corrId },
            );
            await streamImageDataForClassificationProcessing(jobId, batchSize, callback);
        },
        addDataToStore(md5: string, data: any, corrId: string) {
            logger.debug(`adding data to store for classifications for image md5: ${md5}`, {
                id: 'StageDataHandler/Classifier/store',
                corrId,
            });
            addClassifyDataFromProcessing(md5, data, corrId);
        },
        async count(jobId: string, corrId: string) {
            const count = await countNumberOfTasksForClassificationProcessing(jobId);
            logger.debug(`Counted ${count} tasks for classification on job: ${jobId}`, {
                id: 'StageDataHandler/Classifier/count',
                corrId,
            });
            return count;
        },
    } as StageHandler,
};

export default StageDataHandler;
