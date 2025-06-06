import logger from './lib/logger';

export function register() {
    logger.info('instrumentation', '', 'Next.js server booted');
}
