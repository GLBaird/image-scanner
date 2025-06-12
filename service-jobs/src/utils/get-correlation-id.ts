import { Metadata } from '@grpc/grpc-js';

/**
 * Extract correlation id from header metadata on gRPC call
 * @param metadata
 * @returns
 */
const getCorrId = (metadata: Metadata) =>
    metadata.get('x-correlation-id')[0] as string | undefined;

export default getCorrId;
