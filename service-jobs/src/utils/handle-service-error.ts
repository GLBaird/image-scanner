import { Metadata, sendUnaryData, ServerWritableStream, status } from '@grpc/grpc-js';
import { Writable } from 'stream';
import logger from '../../../service-shared/logger';
import ServiceError from './ServiceError';
import { AuthError } from './auth-helper';
import { MissingCorrIdError } from './extract-meta-data';

function isServerWritableStream<Req, Res>(x: unknown): x is ServerWritableStream<Req, Res> {
    return x instanceof Writable; // true for every ServerWritableStream
}

export function handleServiceError<req, resp>(
    error: unknown,
    message: string,
    callback: sendUnaryData<resp> | ServerWritableStream<req, resp>,
    logId: { id: string; corrId?: string },
) {
    logger.error(
        `error ${message}: #${(error as ServiceError)?.code ?? status.ABORTED} ${error}`,
        logId,
    );
    if (error instanceof ServiceError) {
        const e = {
            code: error.code,
            details: error.message,
            metadata: new Metadata(),
        };
        if (isServerWritableStream(callback)) {
            callback.emit('error', e);
        } else {
            callback(e);
        }
    }
    if (error instanceof AuthError) {
        const e = {
            code: status.UNAUTHENTICATED,
            details: 'Invalid or missing JWT',
            metadata: new Metadata(),
        };
        if (isServerWritableStream(callback)) {
            callback.emit('error', e);
        } else {
            callback(e);
        }
    }
    if (error instanceof MissingCorrIdError) {
        const e = {
            code: status.CANCELLED,
            details: 'bad request',
            metadata: new Metadata(),
        };
        if (isServerWritableStream(callback)) {
            callback.emit('error', e);
        } else {
            callback(e);
        }
    } else {
        const e = {
            code: status.ABORTED,
            details: `error ${message}: ${error}`,
            metadata: new Metadata(),
        };
        if (isServerWritableStream(callback)) {
            callback.emit('error', e);
        } else {
            callback(e);
        }
    }
}
