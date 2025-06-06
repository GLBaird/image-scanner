import moment from 'moment';
import { EnvVariables, getEnv } from '@/envs';
import { Colors } from './terminal';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Log level extracted from ENV in production, and set to debug in development. You can override to trace if needed in debug here.
const logLevelEnv = process.env.NODE_ENV === 'production' ? getEnv(EnvVariables.logLevel).toLowerCase() : 'debug';
const logLevels = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5,
};
const sysLogLevel = logLevels[(logLevelEnv as LogLevel) ?? 'info'];

const logColors = {
    trace: Colors.GREY,
    debug: Colors.CYAN,
    info: Colors.BLUE,
    warn: Colors.YELLOW,
    error: Colors.RED,
    fatal: Colors.MAGENTA,
};

const monochromeLog = !!getEnv(EnvVariables.logMonochrome).match(/^(true|t|yes|y)$/i);
const dateFormat = getEnv(EnvVariables.logDateFormat);

/**
 * Logger for use with for generating more detailed logs.
 * When running in a docker container, have stdout or stderr stream to a log file.
 * Docker and Docker Compose will add relevant dates to log.
 * CorrId is optional, and id should always detail where the log is being made from:
 * 'create-account/signInWithCredentials'
 * For development purposes only, you can add dates to the logger with LOG_DATE_FORMAT
 */
class logger {
    static log<T extends unknown[]>(level: LogLevel, id: string, corrId: string = '', ...values: T) {
        if (logLevels[level] < sysLogLevel) return;
        const date = dateFormat && process.env.NODE_ENV !== 'production' ? `[${moment().format(dateFormat)}] ` : '';
        const col = logColors[level];
        const info = monochromeLog
            ? `${date}[${level}] [${id}] ${corrId && `[${corrId}]`}`
            : `${Colors.WHITE}${date}${col}[${level}] ${Colors.GREEN}[${id}] ${corrId && `[${corrId}] `}${
                  Colors.WHITE
              }`;
        console.log(info, ...values);
    }
    static debug<T extends unknown[]>(id: string, corrId: string = '', ...values: T) {
        this.log('debug', id, corrId, ...values);
    }
    static info<T extends unknown[]>(id: string, corrId: string = '', ...values: T) {
        this.log('info', id, corrId, ...values);
    }
    static warn<T extends unknown[]>(id: string, corrId: string = '', ...values: T) {
        this.log('warn', id, corrId, ...values);
    }
    static error<T extends unknown[]>(id: string, corrId: string = '', ...values: T) {
        this.log('error', id, corrId, ...values);
    }
    static fatal<T extends unknown[]>(id: string, corrId: string = '', ...values: T) {
        this.log('fatal', id, corrId, ...values);
    }
}

export default logger;
