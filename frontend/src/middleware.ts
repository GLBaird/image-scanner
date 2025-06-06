import NextAuth from 'next-auth';
import baseConfig from './auth.config';
import Routes from './lib/routes';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import logger from '@/lib/logger';

const { auth } = NextAuth(baseConfig);

export default auth((req) => {
    // auth middleware...
    if (!req.auth) {
        logger.info('middleware', '', 'redirecting unauthorised request to sign-in');
        return NextResponse.redirect(new URL(Routes.SIGN_IN, req.url));
    }

    // add correlation id to header
    const corrId = req.headers.get('x-corr-id') ?? nanoid();

    const res = NextResponse.next();
    res.headers.set('x-corr-id', corrId);
    return res;
});

export const config = {
    matcher: ['/((?!$|api|sign-in|create-account|welcome|_next/static|_next/image|favicon\\.ico).+)'],
};
