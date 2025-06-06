import { pbkdf2Sync, randomBytes, createHmac, createCipheriv, createDecipheriv } from 'crypto';
import { EnvVariables, getEnv } from '@/envs';

/**
 * Deterministically hash a password + salt pair.
 *
 * @param password - the user-supplied secret (UTF-8 string)
 * @param salt     - a cryptographically-random salt (UTF-8 string or Buffer)
 * @param iterations - number of PBKDF2 rounds (default 100 000; raise over time)
 * @returns 64-byte hex string
 */
export function hashPassword(password: string, salt: string | Buffer, iterations = 100_000): string {
    const keyLen = 64;
    const digest = 'sha512';
    const pepper = getEnv(EnvVariables.appPepper);

    return pbkdf2Sync(password + pepper, salt, iterations, keyLen, digest).toString('hex');
}

/**
 * Create a random salt.
 *
 * @param bytes     Number of random bytes (default 16 → 128 bits)
 * @param encoding  "base64" (default) or "hex"
 * @returns         Encoded salt string
 *
 * @example
 *   const salt  = generateSalt();          // "QjvU8S74v1rlMfo9T4Vn0A=="
 *   const salt2 = generateSalt(32, "hex"); // 64-char hex string
 */
export function generateSalt(bytes: number = 16, encoding: 'base64' | 'hex' = 'base64'): string {
    return randomBytes(bytes).toString(encoding);
}

// -- keys for email encryption and tokenisation -----------------------
const HMAC_KEY = Buffer.from(getEnv(EnvVariables.appHmacKey)!, 'hex');
const ENC_KEY = Buffer.from(getEnv(EnvVariables.appAesKey)!, 'hex');

function canonical(email: string) {
    return email.trim().toLowerCase();
}

/**
 * Will hash email address to create a lookup token for searching the DB for a user
 * @param email     Email string to tokenise
 * @returns         Buffer array of token
 */
export function hashEmail(email: string): Buffer<ArrayBufferLike> {
    return createHmac('sha256', HMAC_KEY).update(canonical(email)).digest();
}

/**
 * Will encrypt a string for storing on DB
 * @param email     Email string to encrpt
 * @returns         Buffer array of encrypted email
 */
export function encryptString(info: string): Buffer<ArrayBuffer> {
    const iv = randomBytes(12); // GCM 96-bit IV
    const cipher = createCipheriv('aes-256-gcm', ENC_KEY, iv);
    const ciphertext = Buffer.concat([cipher.update(info, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]);
}

/**
 * Will decrypt a string of data for buyffer array stored on DB
 * @param data  Buffer array of encrypted string data
 * @returns     Decrypted string
 */
export function decryptString(data: Uint8Array): string {
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const ct = data.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', ENC_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ct).toString('utf8') + decipher.final('utf8');
}
