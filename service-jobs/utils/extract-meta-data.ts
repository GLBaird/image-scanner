import { ServerUnaryCall } from '@grpc/grpc-js';
import getCorrId from './get-correlation-id';
import { LoggerId, LoggerIdFactory } from '../logger';

export function extractMetaData<T, I>(
    call: ServerUnaryCall<T, I>,
    methodName: string,
    loggerMeta: LoggerIdFactory,
): {
    request: T;
    corrId: string | undefined;
    logId: LoggerId;
} {
    const { request } = call;
    const corrId = getCorrId(call.metadata);
    const logId = loggerMeta(methodName, corrId);
    return { request, corrId, logId };
}
