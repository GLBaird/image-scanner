'use server';

import { cache } from 'react';
import { GetImagesResponse } from '@/generated/jobmanager/GetImagesResponse';
import JobManagerClient from '@/grpc/JobManagerClient';
import checkForAuthAndErrors from '@/lib/check-for-auth-errors';
import logger from '@/lib/logger';
import { fromTimestamp } from '@/lib/timestamp';

const BATCH_SIZE = 100;

export const getBatchSize = async () => BATCH_SIZE;

export type ImageData = {
    id: string;
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
    exifData: { [key: string]: string | number };
    faces: { hash: string; x: number; y: number; width: number; height: number }[];
    tags: string;
};

const parseJsonExifDataSafely = (
    logId: string,
    corrId: string,
    json: string | undefined,
): { [key: string]: string } => {
    try {
        if (!json) return {};
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed) || typeof parsed !== 'object') return {};
        Object.keys(parsed).forEach((k) => {
            if (typeof parsed[k] === 'string') return;
            if (typeof parsed[k] === 'boolean') parsed[k] = parsed[k] ? 'yes' : 'no';
            parsed[k] = `${parsed[k]}`;
        });
        return parsed;
    } catch (e) {
        logger.error(logId, corrId, 'failed to parse json', (e as Error)?.message ?? e);
        return {};
    }
};

export const getImages = cache(
    async (
        jobId: string,
        cursor: string = '',
        items: number = BATCH_SIZE,
    ): Promise<{ errors: string[]; images?: ImageData[] }> => {
        const logId = 'actions/images/getImages';
        const { errors, corrId } = await checkForAuthAndErrors(logId);

        logger.info(logId, corrId, 'loading images:', cursor, items);

        if (!jobId) {
            errors.push('invalid job reference');
        }

        if (errors.length > 0) return { errors };

        try {
            // load data from gRPC service-jobs
            const client = await JobManagerClient.getClient();
            const metadata = await JobManagerClient.getRequestHeaders();
            const response = await new Promise<GetImagesResponse>((resolve, reject) => {
                client.getImages({ jobId, cursor, items }, metadata, (err, resp) => {
                    if (err) reject(err);
                    if (resp) resolve(resp);
                });
            });

            let errors: string[] = [];
            let images: ImageData[] = [];

            if (response.errors?.values) {
                logger.error(logId, corrId, `errors loading images from gRPC: ${response.errors.values?.join(', ')}}`);
                errors = response.errors.values.map((e) => e.message ?? `${e}`);
            }

            if (response.images?.values) {
                images = response.images.values.map(
                    (image) =>
                        ({
                            ...image,
                            createdAt: fromTimestamp(image.createdAt!),
                            faces: image.faces ?? [],
                            exifData: parseJsonExifDataSafely(logId, corrId, image.exifData),
                        } as ImageData),
                );
            }

            return { images, errors };
        } catch (error) {
            const message = `${(error as Error)?.message ?? error}`;
            logger.error(logId, corrId, 'error loading image data', message);
            return { errors: ['Server error loading images.', message] };
        }
    },
);
