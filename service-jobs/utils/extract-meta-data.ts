import { ServerUnaryCall } from '@grpc/grpc-js';
import getCorrId from './get-correlation-id';
import { requireJwt } from './auth-helper';

export class MissingCorrIdError extends Error {
    constructor(message = 'missing correlation id') {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MissingCorrIdError);
        }
    }
}

export function extractMetaData<T, I>(
    call: ServerUnaryCall<T, I>,
): {
    request: T;
    corrId: string | undefined;
    claims: { sub: string; role: string };
} {
    const { request } = call;
    const corrId = getCorrId(call.metadata);
    if (!corrId) throw new MissingCorrIdError();
    let claims = requireJwt(call);

    return { request, corrId, claims };
}
