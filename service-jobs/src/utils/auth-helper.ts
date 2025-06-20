import { ServerUnaryCall, Metadata } from '@grpc/grpc-js';
import { encryptWithA256CBC_HS512, decryptWithA256CBC_HS512 } from './jwe';
import config from '../configs/server';
import { JWTPayload } from 'jose-node-cjs-runtime';
import logger from '../../../service-shared/logger';

export class AuthError extends Error {
    constructor(message = 'missing or invalid authentication') {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AuthError);
        }
    }
}

/**
 * Tiny wrapper that verifies the Auth.js JWT.
 * Call it at the **top** of every gRPC handler.
 *
 * @returns {claims|null} – decoded JWT payload if valid = check for null as claims are invalid
 * @throws {AuthError} if token invalid or not found
 */
export async function requireJwt(
    call: ServerUnaryCall<any, any>,
): Promise<{ payload: JWTPayload; raw: string }> {
    const raw = ((call.metadata.get('authorization')[0] as string | undefined) ?? '').replace(
        /^Bearer\s+/i,
        '',
    );
    try {
        const { payload } = await decryptWithA256CBC_HS512(raw, config.auth.secret);
        return { payload, raw };
    } catch (err) {
        logger.error(`JWT decryption failed: ${err}`, { id: 'auth-helper/requireJwt' });
        throw new AuthError('missing or invalid token');
    }
}

/**
 * Build a signed JWT for tests
 *
 * @param overrides  – any extra / overriding claims you need
 */
export async function makeTestToken(
    userId: string = 'test-user-id',
    overrides: Record<string, unknown> = {},
) {
    const now = Math.floor(Date.now() / 1000);

    const claims = {
        sub: userId,
        role: 'user',
        iat: now,
        exp: now + 60 * 60, // 1h
        ...overrides,
    };

    return await encryptWithA256CBC_HS512(claims, config.auth.secret);
}

/** Helper that returns Metadata with the bearer token already set */
export function makeAuthMetadata(token?: string) {
    const md = new Metadata();
    md.set('authorization', `Bearer ${token ?? makeTestToken()}`);
    return md;
}
