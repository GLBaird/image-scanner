// lib/jwe.ts
import { CompactEncrypt, compactDecrypt } from 'jose';

/**
 * Encrypts a JSON payload with dir+A256CBC-HS512.
 * @param payload    Object to encrypt.
 * @param secretB64  Base64-encoded 64-byte CEK.
 */
export async function encryptWithA256CBC_HS512(payload: object, secretB64: string): Promise<string> {
    const cek = Buffer.from(secretB64, 'base64');
    if (cek.length !== 64) {
        throw new TypeError(`Invalid key length: expected 512 bits (64 bytes), got ${cek.length * 8} bits`);
    }
    return await new CompactEncrypt(new TextEncoder().encode(JSON.stringify(payload)))
        .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
        .encrypt(cek);
}

/**
 * Decrypts a compact JWE with dir+A256CBC-HS512.
 * @param token      Compact JWE string.
 * @param secretB64  Base64-encoded 64-byte CEK.
 */
export async function decryptWithA256CBC_HS512(
    token: string,
    secretB64: string,
): Promise<{ header: Record<string, unknown>; payload: unknown }> {
    const cek = Buffer.from(secretB64, 'base64');
    if (cek.length !== 64) {
        throw new TypeError(`Invalid key length: expected 512 bits (64 bytes), got ${cek.length * 8} bits`);
    }
    const { plaintext, protectedHeader } = await compactDecrypt(token, cek);
    const json = new TextDecoder().decode(plaintext);
    return { header: protectedHeader, payload: JSON.parse(json) };
}
