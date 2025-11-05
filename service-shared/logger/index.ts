import { createLogger, transports, format } from 'winston';
import 'winston-daily-rotate-file';
import config from '../configs/config';

const logger = createLogger({
    level: config.logger.level,
    format: format.combine(format.timestamp(), format.json()),
    defaultMeta: { service: config.logger.serviceName },
    transports: [
        new transports.DailyRotateFile({
            filename: config.logger.errorLog,
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            maxSize: '10m',
        }),
        new transports.DailyRotateFile({
            filename: config.logger.combinedLog,
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            maxSize: '10m',
        }),
        new transports.Console({
            format: format.combine(format.colorize(), format.simple()),
            handleExceptions: true,
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
