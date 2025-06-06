import { createLogger, transports, format } from 'winston';
import config from '../configs/server';

const logger = createLogger({
    level: config.logger.level,
    format: format.combine(format.timestamp(), format.json()),
    defaultMeta: { service: 'job-manager' },
    transports: [
        new transports.File({
            filename: config.logger.errorLog,
            level: 'error',
            maxsize: 10,
            rotationFormat: () => '_' + new Date().toISOString().split('T')[0],
        }),
        new transports.File({
            filename: config.logger.combinedLog,
            maxsize: 10,
            rotationFormat: () => '_' + new Date().toISOString().split('T')[0],
        }),
        new transports.Console({
            format: format.combine(format.colorize(), format.simple()),
        }),
    ],
});

export function getLoggerMetaFactory(name: string) {
    return (method: string, corrId: string = '') => ({
        id: `${name}/${method}`,
        corrId,
    });
}

export default logger;
