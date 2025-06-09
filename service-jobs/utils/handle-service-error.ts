import { sendUnaryData } from '@grpc/grpc-js';
import logger from '../logger';
import ServiceError from './ServiceError';

export function handleServiceError(
    error: unknown,
    message: string,
    callback: sendUnaryData<unknown>,
    logId: { id: string; corrId?: string },
) {
    logger.error(`error ${message}: ${error}`, logId);
    if (error instanceof ServiceError) {
        callback(error);
    } else {
        callback(new ServiceError(`error ${message}: ${error}`, 500));
    }
}
