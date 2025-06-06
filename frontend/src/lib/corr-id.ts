import { headers } from 'next/headers';

export async function getCorrId(): Promise<string> {
    const hdr = await headers();
    return hdr.get('x-corr-id') ?? '';
}
