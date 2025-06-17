import { ServerUnaryCall } from '@grpc/grpc-js';
import getCorrId from './get-correlation-id';
import { requireJwt } from './auth-helper';
import { JWTPayload } from 'jose-node-cjs-runtime';

export class MissingCorrIdError extends Error {
    constructor(message = 'missing correlation id') {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MissingCorrIdError);
        }
    }
}

export async function extractMetaData<T, I>(
    call: ServerUnaryCall<T, I>,
): Promise<{
    request: T;
    corrId: string | undefined;
    claims: { payload: JWTPayload , raw: string };
}> {
    const { request } = call;
    const corrId = getCorrId(call.metadata);
    if (!corrId) throw new MissingCorrIdError();
    let claims = await requireJwt(call);

    return { request, corrId, claims };
}
