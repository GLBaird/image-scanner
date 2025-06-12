import { ServerWritableStream } from '@grpc/grpc-js/build/src/server-call';
import { status } from '@grpc/grpc-js';
import path from 'path';
import logger, { getLoggerMetaFactory } from '../logger';
import { createReadStream, existsSync } from 'fs';
import { GetDataRequest } from '../generated/jobmanager/GetDataRequest';
import { GetDataResponse } from '../generated/jobmanager/GetDataResponse';
import SourceController from '../controllers/SourceController';

function streamSourceFile(
    request: GetDataRequest,
    call: ServerWritableStream<GetDataRequest, GetDataResponse>,
    corrID: string | undefined,
) {
    const logId = getLoggerMetaFactory('JobManagerController')('streamSourceFile', corrID);
    const { filepath } = request;
    if (!filepath) return call.emit('error', { code: status.CANCELLED, details: 'bad request' });
    const fullpath = path.join(SourceController.sourcePath(), filepath);

    logger.debug(`searching for file: ${filepath}...`, logId);

    if (!existsSync(fullpath)) {
        logger.info(`request for file: ${fullpath} not found`, logId);
        return call.emit('error', { code: status.NOT_FOUND, details: 'file not found' });
    }
    const readStream = createReadStream(fullpath);

    readStream.on('data', (chunk) => {
        call.write({ data: chunk });
    });

    readStream.on('end', () => {
        logger.debug(`finished streaming file: ${filepath}`, logId);
        call.end();
    });

    readStream.on('error', (error) => {
        logger.error(`error streaming file: ${filepath} - ${error}`, logId);
        call.emit('error', { code: status.ABORTED, details: 'server error: file stream failed' });
    });
}

export default streamSourceFile;
