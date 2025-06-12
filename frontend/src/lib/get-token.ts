import 'server-only';

import { cookies } from 'next/headers';
import { getToken } from 'next-auth/jwt';

/**
 * Use to gain access to raw token for calling to gRPC services
 * @returns
 */
export default async function getAuthToken(): Promise<string> {
    const cookieHeader = (await cookies()).toString();
    const req = new Request('https://example.com', {
        headers: { cookie: cookieHeader },
    });
    const rawToken = await getToken({
        req,
        raw: true,
    });

    return rawToken;
}
