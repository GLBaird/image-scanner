import { status } from '@grpc/grpc-js';

class ServiceError extends Error {
    code: status;

    constructor(message: string, code: status = status.ABORTED) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ServiceError);
        }
    }
}

export default ServiceError;
