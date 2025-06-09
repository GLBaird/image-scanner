/**
 * ENV Store for default values. Log all env variables used in the app here. Access via getEnv for handling default values for development.
 */
export const EnvVariables = {
    /** @description URL for access to Postgres DB */
    databaseUrl: {
        ref: 'DATABASE_URL',
        default: 'postgresql://postgres:postgres@localhost:5432/scanner-frontend?schema=public',
    },
    /** @description Added by `npx auth`. Read more: https://cli.authjs.dev */
    authSecret: { ref: 'AUTH_SECRET', default: 'jqE4YdBGILNOKsBJUKwyFkM3k99+ePINsVptlNEukPo=' },
    /** @description Auth0 - Github ID */
    authGithubId: { ref: 'AUTH_GITHUB_ID', default: '' },
    /** @description Auth0 - Github Secret */
    AuthGithubSecret: { ref: 'AUTH_GITHUB_SECRET', default: '' },
    /** @description Auth0 - Google Id */
    AuthGoogleId: { ref: 'AUTH_GOOGLE_ID', default: '' },
    /** @description Auth0 - Google Secret */
    AuthGoogleSecret: { ref: 'AUTH_GOOGLE_SECRET', default: '' },
    /** @description App level pepper for hashing password */
    appPepper: { ref: 'APP_PEPPER', default: '__DEV__APP__PEPPER__' },
    /** @description App level HMAC Key used for encrypting and decrypting data */
    appHmacKey: { ref: 'APP_HMAC_KEY', default: '__DEV__HMAC_KEY__' },
    /** @description App level AES key used for encrypting and decrypting data */
    appAesKey: { ref: 'APP_AES_KEY', default: '__DEV_AES_KEY__' },
    /** @description log level for production - development is always trace */
    logLevel: { ref: 'LOG_LEVEL', default: 'info' },
    /** @description log color - set as true, yes or y for monochramitic log */
    logMonochrome: { ref: 'LOG_MONOCHROME', default: 'false' },
    /** @description log date format - default is no date added to log, as date and external logging is handled by docker. Date can be added for development only. */
    logDateFormat: { ref: 'LOG_DATE_FORMAT', default: '' },
};

/**
 * Use to access environment variables and handle default values centrally.
 * Ensure you set env variable needed in the store EnvVariables in src/env.ts
 * @example
 * const value = getEnv(EnvVariables.databaseUrl);
 * @param reference get from EnvVariable object
 * @returns
 */
export function getEnv(reference: { ref: string; default: string }): string {
    return (process.env[reference.ref] ?? reference.default).trim();
}
