'use server';

import { signIn } from '@/auth';
import { createUser, isEmailOnSystem } from '@/data-access/user';
import logger from '@/lib/logger';
import { normaliseErrorPath } from '@/lib/utils';
import { createAccountDataSchema } from '@/schemas/CreateAccount';
import { AuthError } from 'next-auth';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export async function createNewAccount(data: unknown) {
    'use server';
    const loggerId = 'actions/create-account/createNewAccount';
    logger.info(loggerId);

    const parsed = createAccountDataSchema.safeParse(data);
    if (!parsed.success) {
        logger.warn(
            loggerId,
            '',
            'errors parsing form data:',
            parsed.error.issues.map((i) => `${i.path}: ${i.message}`).join(', '),
        );
        return {
            errors: parsed.error.issues.map((i) => ({
                field: normaliseErrorPath(i.path, ['email', 'password']),
                message: i.message,
            })),
        };
    }

    try {
        const { username, email, password } = parsed.data;
        const userExists = await isEmailOnSystem(email);
        if (userExists) return { errors: ['Email is already used by an existing account.'] };
        const id = await createUser(username, email, password);
        logger.info(loggerId, '', 'Created new user on system with id:', id);
        await signIn('credentials', { email, password, redirectTo: '/dashboard' });
    } catch (error) {
        if (error instanceof AuthError && error.type === 'CredentialsSignin') {
            logger.info(loggerId, '', 'could not authenticate new user account', error);
            return { errors: ['Could not authenticate new account - try signing in again later.'] };
        }
        if (isRedirectError(error)) {
            logger.debug(loggerId, '', 'authentication redirection');
            throw error;
        }
        logger.error(loggerId, '', 'server error creating user account:', (error as Error)?.message ?? error);
        return { errors: ['Server error.'] };
    }
}
