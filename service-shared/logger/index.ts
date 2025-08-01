import { createLogger, transports, format } from 'winston';
import config from '../configs/config';

const logger = createLogger({
    level: config.logger.level,
    format: format.combine(format.timestamp(), format.json()),
    defaultMeta: { service: config.logger.serviceName },
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

export type LoggerId = { id: string; corrId?: string };
export type LoggerIdFactory = (methods: string, corrId?: string) => LoggerId;

export function getLoggerMetaFactory(name: string): LoggerIdFactory {
    return (method: string, corrId: string = '') => ({
        id: `${name}/${method}`,
        corrId,
    });
}

export default logger;
