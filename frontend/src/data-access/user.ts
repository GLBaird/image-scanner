import 'server-only';
import { cache } from 'react';
import prisma from '@/lib/prisma';
import { generateSalt, hashPassword, hashEmail } from '@/lib/crypt';
import logger from '@/lib/logger';

export type UserData = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    name: string | null;
    image: string | null;
    provider: string;
};

const makeLoggerId = (id: string) => `data-access/user/${id}`;

/**
 * Used to verify a user's credentials are correct
 * @param email
 * @param password
 * @returns
 */
export async function verifyUserCredentials(email: string, password: string, corrId: string = ''): Promise<boolean> {
    logger.debug(makeLoggerId('verifyUserCredentials'), corrId, email);
    const emailHash = hashEmail(email);
    const userCredentials = await prisma.credentials.findUnique({ where: { ref: emailHash } });
    if (!userCredentials) return false;
    const hashedPassword = hashPassword(password, userCredentials.salt);
    return hashedPassword === userCredentials.password;
}

/**
 * Used to check if a user with a given email exists on a system
 * @param email
 * @returns True if user found
 */
export async function isEmailOnSystem(email: string, corrId: string = ''): Promise<boolean> {
    logger.debug(makeLoggerId('isEmailOnSystem'), corrId, email);
    const count = await prisma.user.count({ where: { email } });
    return count > 0;
}

/**
 * Get list of users. Limit to n amount of users with count. Use cursor instead of pagination.
 * Cursor is the id of the last user record, from which to selet n number of users from.
 * @param count      Number of user records to return
 * @param cursor     ID of last user to count from
 * @returns
 */
export const getUsers = cache(async (count: number, cursor?: string, corrId: string = ''): Promise<UserData[]> => {
    logger.debug(makeLoggerId('getUsers'), corrId, 'count', count, 'cursor', cursor);
    const users = await prisma.user.findMany({
        orderBy: { email: 'asc' },
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        take: count,
        include: {
            accounts: {
                select: { provider: true },
                take: 1,
            },
        },
    });

    return users.map((user: (typeof users)[number]) => ({
        ...user,
        provider: user.accounts[0]?.provider ?? 'credentials',
    }));
});

/**
 * Get user from a given email
 * @param email
 * @returns
 */
export const getUser = cache(async (email: string, corrId: string = ''): Promise<UserData | null> => {
    logger.debug(makeLoggerId('getUser'), corrId, email);
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            accounts: {
                select: { provider: true },
                take: 1,
            },
        },
    });
    if (!user) return null;
    return {
        ...user,
        provider: user.accounts[0]?.provider ?? 'credentials',
    };
});

/**
 * Create a new user on system
 * @param name
 * @param email
 * @param password
 * @returns
 */
export async function createUser(name: string, email: string, password: string, corrId: string = ''): Promise<string> {
    const logId = makeLoggerId('createUser');
    logger.debug(logId, corrId, name, email);
    const hashedEmail = hashEmail(email);
    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);

    const user = await prisma.user.create({
        data: {
            name,
            email,
        },
    });
    logger.debug(logId, corrId, 'created user with id:', user.id);

    const credentials = await prisma.credentials.create({
        data: {
            ref: hashedEmail,
            password: hashedPassword,
            salt: salt,
        },
    });
    logger.debug(logId, corrId, 'created credentials with id:', credentials.id);

    return user.id;
}

/**
 * Delete a user
 * @param id
 */
export async function deleteUser(id: string, corrId: string = '') {
    const logId = makeLoggerId('deleteUser');
    logger.debug(logId, corrId, 'Deleting user with ID:', id);
    const user = await prisma.user.findUnique({ where: { id } });
    logger.warn(logId, corrId, 'Deleting user, but no user found with id:', id);
    if (!user) return;
    await prisma.user.delete({ where: { id } });
    const hashedEmail = hashEmail(user.email);
    const { count } = await prisma.credentials.deleteMany({ where: { ref: hashedEmail } });
    if (count > 0) logger.debug(logId, corrId, 'Removed user credentials for id:', id);
    else logger.debug(logId, corrId, 'No credentials to delete for user id:', id);
}

/**
 * Updates user on system with given data.
 * Will cause credentials to update and change if given data updates either email or password.
 * @param id
 * @param update
 * @returns
 */
export async function updateUser(
    id: string,
    update: { name?: string; email?: string; password?: string; image?: string },
    corrId: string = '',
) {
    const logId = makeLoggerId('updateUser');
    logger.debug(logId, corrId, 'updating user with id:', id, 'update:', JSON.stringify(update));

    // prepare data to update for user
    const { name, email, password, image } = update;
    const data = {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(image !== undefined && { image }),
    };
    const updatingCredentials = email !== undefined || password !== undefined;
    const unchangedUserData = updatingCredentials ? await prisma.user.findUnique({ where: { id } }) : null;
    await prisma.user.update({ where: { id }, data });

    if (!updatingCredentials) return;
    logger.debug(logId, corrId, 'updating user credentials');

    // prepare credentials update as needed
    const salt = password !== undefined && generateSalt();
    const credentialsReference = hashEmail(unchangedUserData!.email); // ref for credentials from original user email
    const credentialsUpdate = {
        ...(email !== undefined && { ref: hashEmail(email) }), // if email updated credentials needs a new hashed email reference
        ...(password !== undefined && { password: hashPassword(password, salt as string), salt: salt as string }),
    };
    // credentials has to be updated via hash of previous email
    await prisma.credentials.update({ where: { ref: credentialsReference }, data: credentialsUpdate });
}
