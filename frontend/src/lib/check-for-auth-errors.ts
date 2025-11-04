import { auth } from '@/auth';
import { getCorrId } from '@/lib/corr-id';
import logger from '@/lib/logger';

/**
 * Checks for auth session and corrId, and if an array of required value are provide, will check
 * they are not undefined, null or empty strings.
 * @param logId     id needed for logging
 * @param values    array of values to check exist
 * @returns
 */
export default async function checkForAuthAndErrors(
    logId: string,
    values?: unknown[],
    defaultCorrId?: string,
): Promise<{ errors: string[]; corrId: string }> {
    const session = await auth();
    const corrId = defaultCorrId ?? (await getCorrId());
    const errors = [];

    if (!session) {
        logger.warn(logId, corrId, 'user not authorised');
        errors.push('User not authorised.');
    }

    if (!corrId && !defaultCorrId) {
        logger.warn(logId, corrId, 'request is missing CorrId');
        errors.push('Request missing correct data.');
    }

    if (values && values.reduce((acc, val) => acc && typeof val !== 'number' && !val, false)) {
        logger.warn(logId, corrId, 'request is missing required data');
        errors.push('bad request, required data is missing.');
    }

    return { errors, corrId };
}
