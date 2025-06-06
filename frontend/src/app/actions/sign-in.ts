'use server';

import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { signInSchema } from '@/schemas/SignIn';
import { normaliseErrorPath } from '@/lib/utils';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import logger from '@/lib/logger';

const makeLoggerId = (id: string) => `actions/sign-in/${id}`;

export async function signInWithCredentials(data: unknown) {
    'use server';
    const loggerId = makeLoggerId('signInWithCredentials');
    logger.info(loggerId);

    const parsed = signInSchema.safeParse(data);

    if (!parsed.success) {
        logger.warn(
            loggerId,
            '',
            'failed to parse credentials:',
            parsed.error.issues.map((i) => `${i.path}: ${i.message}`).join(','),
        );
        return {
            errors: parsed.error.issues.map((i) => ({
                field: normaliseErrorPath(i.path, ['email', 'password']),
                message: i.message,
            })),
        };
    }
    try {
        await signIn('credentials', { ...parsed.data, redirectTo: '/dashboard' });
    } catch (error) {
        if (error instanceof AuthError && error.type === 'CredentialsSignin') {
            logger.info(loggerId, '', 'Invalid credentials');
            return { errors: ['Incorrect email or password.'] };
        }
        if (isRedirectError(error)) {
            logger.debug(loggerId, '', 'Authentication redirect');
            throw error;
        }
        logger.error(loggerId, '', 'Server error authenticating user.', (error as Error)?.message ?? error);
        return { errors: ['Server error.'] };
    }
}

async function signInWithProvider(provider: 'github' | 'google') {
    'use server';
    logger.info(makeLoggerId('signInWithProvider'), '', 'Signing in with provider:', provider);
    await signIn(provider, { redirectTo: '/dashboard' });
}

export async function signInWithGoogle() {
    'use server';
    return await signInWithProvider('google');
}

export async function signInWithGithub() {
    'use server';
    return await signInWithProvider('github');
}
