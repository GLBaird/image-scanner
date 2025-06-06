import { NextAuthConfig } from 'next-auth';
import { encode, decode } from 'next-auth/jwt';
import Routes from '@/lib/routes';

const baseConfig: NextAuthConfig = {
    providers: [],
    pages: {
        error: Routes.ERROR,
        signIn: Routes.SIGN_IN,
    },

    session: {
        strategy: 'jwt',
    },
    jwt: { encode, decode },
};

export default baseConfig;
