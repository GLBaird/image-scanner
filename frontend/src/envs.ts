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
    /** @description generated from generate_auth_key.js - for encrypting and descrypting JWE tokens */
    jweSecret: {
        ref: 'JWE_SECRET',
        default: 'oRVQGb1cDGLdbhXrP1DT0Kqym81MYl5WfOKibjtTtxGP62h+Ot1NA+3eX8VUPIH0h4+O65dhnm79hF7k5kjQhQ==',
    },
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
    /** @description domain for gRPC service JobManager */
    grpcDomain: { ref: 'GRPC_DOMAIN', default: '0.0.0.0' },
    /** @description port for gRPC service JobManager */
    grpcPort: { ref: 'GRPC_PORT', default: '5042' },
    /** URL for Server Side Events for progress updates. Port 4042 for http and 4043 for https / prod */
    sseUrl: { ref: 'SSE_URL', default: 'http://localhost:4042/events' },
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
