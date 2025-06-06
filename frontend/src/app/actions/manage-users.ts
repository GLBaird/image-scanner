'use server';

import { revalidateTag } from 'next/cache';
import { auth } from '@/auth';
import { deleteUser } from '@/data-access/user';
import { getCorrId } from '@/lib/corr-id';
import logger from '@/lib/logger';
import CacheTags from '@/lib/cache-tags';

export async function deleteUserData(id: string): Promise<{ errors?: string[] }> {
    const session = await auth();
    const corrId = await getCorrId();
    const logId = 'actions/manage-users/deleteUserData';

    logger.info(logId, corrId, 'deleting user with id:', id);

    if (!session) {
        logger.warn(logId, corrId, 'user not authorised');
        return { errors: ['User not authorised.'] };
    }
    if (typeof id !== 'string' || !id) {
        logger.debug(logId, corrId, 'request for deleting user has not provided correct type for id.', id);
        return { errors: ['Incorrect data has been sent'] };
    }
    if (!corrId) {
        logger.warn(logId, corrId, 'request is missing CorrId');
        return { errors: ['Request missing correct data.'] };
    }

    try {
        await deleteUser(id, corrId);
        logger.debug(logId, corrId, 'user has been successfully deleted');
        revalidateTag(CacheTags.users);
    } catch (error) {
        logger.error(logId, corrId, 'error deleting user with id:', id, (error as Error)?.message ?? error);
        return { errors: ['Server error deleting user.'] };
    }

    return {};
}
