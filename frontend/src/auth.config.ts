import { NextAuthConfig } from 'next-auth';
import Routes from '@/lib/routes';
import { encryptWithA256CBC_HS512, decryptWithA256CBC_HS512 } from './lib/jwe';
import { EnvVariables, getEnv } from './envs';

const baseConfig: NextAuthConfig = {
    providers: [],
    pages: {
        error: Routes.ERROR,
        signIn: Routes.SIGN_IN,
    },

    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async jwt({ token }) {
            return token;
        },
        async session({ session }) {
            return session;
        },
    },
    jwt: {
        encode: async ({ token }) => {
            if (!token) return '';
            return encryptWithA256CBC_HS512(token, getEnv(EnvVariables.jweSecret));
        },
        decode: async ({ token }) => {
            if (!token) return null;
            const { payload } = await decryptWithA256CBC_HS512(token, getEnv(EnvVariables.jweSecret));
            return payload;
        },
    },
    // JWE_SECRET must be a 64-byte Base64 string
    secret: getEnv(EnvVariables.authSecret),
};

export default baseConfig;
