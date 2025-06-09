import { ServerUnaryCall, sendUnaryData, Metadata } from '@grpc/grpc-js';
import * as jwt from 'jsonwebtoken';
import config from '../configs/server';

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
export function requireJwt<Req, Res>(call: ServerUnaryCall<Req, Res>) {
    const raw = (call.metadata.get('authorization')[0] as string | undefined) ?? '';
    const token = raw.replace(/^Bearer\s+/i, '');

    try {
        return jwt.verify(token, config.auth.secret);
    } catch {
        throw new AuthError('missing or invalid token');
    }
}

/**
 * Build a signed JWT for tests
 *
 * @param overrides  – any extra / overriding claims you need
 */
export function makeTestToken(
    userId: string = 'test-user-id',
    overrides: Record<string, unknown> = {},
) {
    const now = Math.floor(Date.now() / 1000);

    // Minimum claims that Auth.js usually puts in the token
    const claims = {
        sub: userId,
        role: 'user',
        iat: now,
        exp: now + 60 * 60, // 1-hour TTL is plenty for tests
        ...overrides,
    };

    return jwt.sign(claims, config.auth.secret, { algorithm: 'HS256' });
}

/** Helper that returns Metadata with the bearer token already set */
export function makeAuthMetadata(token?: string) {
    const md = new Metadata();
    md.set('authorization', `Bearer ${token ?? makeTestToken()}`);
    return md;
}
