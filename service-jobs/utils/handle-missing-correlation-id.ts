import { sendUnaryData } from '@grpc/grpc-js';
import logger from '../logger';
import ServiceError from './ServiceError';

export function handleMissingCorrId(
    callback: sendUnaryData<unknown>,
    logId: { id: string },
) {
    logger.info('bad request', logId);
    callback(new ServiceError('bad request', 400));
}
