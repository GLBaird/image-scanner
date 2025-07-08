import { NextRequest } from 'next/server';
import JobManagerClient from '@/grpc/JobManagerClient';
import path from 'path';
import checkForAuthAndErrors from '@/lib/check-for-auth-errors';
import logger from '@/lib/logger';

export async function GET(req: NextRequest, { params }: { params: Promise<{ filepath: string[] }> }) {
    const logId = 'api/images/';
    const { corrId, errors } = await checkForAuthAndErrors(logId);

    if (errors && errors.length > 0) {
        return new Response(JSON.stringify({ error: 'unauthorised' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const filepath = '/' + (await params).filepath.join('/');
    const mimetype = path.extname(filepath) === '.png' ? 'image/png' : 'image/jpg';

    logger.info(logId, corrId, 'getting image:', mimetype, filepath);

    // Set up streamable response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const client = await JobManagerClient.getClient();
    const meta = await JobManagerClient.getRequestHeaders(corrId);

    return new Promise<Response>((resolve, reject) => {
        const call = client.getData({ filepath }, meta);

        call.on('data', (chunk: { data: Buffer }) => {
            writer.write(chunk.data);
        });

        call.on('end', async () => {
            await writer.close();
        });

        call.on('error', async (err: Error) => {
            await writer.abort(err);
            logger.error(logId, corrId, 'failed to stream image data:', mimetype, filepath, err);
            reject(new Response('Failed to load image from gRPC', { status: 500 }));
        });

        resolve(
            new Response(readable, {
                headers: {
                    'Content-Type': mimetype,
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            }),
        );
    });
}
