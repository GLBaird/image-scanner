import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/prisma';
import { CredentialsSignin } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { verifyUserCredentials, getUser } from '@/data-access/user';
import baseConfig from '@/auth.config';

const credentialsAuth = Credentials({
    credentials: {
        email: {},
        password: {},
    },
    authorize: async (credentials) => {
        if (!credentials) return null;
        const userVerified = await verifyUserCredentials(credentials.email as string, credentials.password as string);
        if (!userVerified) throw new CredentialsSignin('not authorised');
        const user = await getUser(credentials.email as string);
        if (!user) throw new CredentialsSignin('user not found');
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
        };
    },
});

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...baseConfig,
    providers: [GitHub, Google, credentialsAuth],
    adapter: PrismaAdapter(prisma),
});
