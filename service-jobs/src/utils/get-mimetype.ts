import { spawn } from 'child_process';
import * as path from 'path';

const mimeResultPattern = /:\s(.+)(\n)?$/i;

const imageTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.giff': 'image/gif',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.ppm': 'image/x-portable-pixmap',
    '.pgm': 'image/x-portable-pixmap',
    '.pbm': 'image/x-portable-pixmap',
    '.pnm': 'image/x-portable-pixmap',
    '.tga': 'image/x-targa',
    '.targa': 'image/x-targa',
    '.webp': 'image/webp',
    '.psd': 'image/vnd.adobe.photoshop',
    '.cr2': 'image/x-canon-cr2',
    '.icon': 'image/x-icon',
    '.ico': 'image/x-icon',
    '.bmp': 'image/x-ms-bmp',
    '.xcf': 'image/x-xcf',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.svg': 'image/svg+xml',
    '.jp2': 'image/x-jp2',
    '.jpf': 'image/x-jpf',
    '.jpm': 'image/jpm',
    '.pcx': 'image/x-pcx',
    '.pdf': 'application/pdf',
    '.eps': 'application/postscript',
    '.wmf': 'image/x-wmf',
};

/*
 * The system uses mime types to differentiate between images and video
 * video is tested for, and if not true, image is assumed, so it is important that
 * all video mime types start `video/` otherwise could be treated as an image
 */

const videoTypes = {
    '.mp4': 'video/mp4',
    '.m4v': 'video/mp4',
    '.mov': 'video/quicktime',
    '.qt': 'video/quicktime',
    '.mpeg': 'video/mpeg',
    '.mpg': 'video/mpeg',
    '.mp2': 'video/mpeg',
    '.avi': 'video/x-msvideo',
    '.flv': 'video/x-flv',
    '.wmv': 'video/x-ms-wmv',
    '.3gp': 'video/3gpp',
    '.divx': 'video/x-msvideo',
    '.ogv': 'video/ogg',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.mts': 'video/mts',
    '.ts': 'video/MP2T',
    '.m3u8': 'video/x-mpegURL', // this is deliberately wrong -- should be application/x-mpegURL
};

const mediaTypes = { ...imageTypes, ...videoTypes } as const;

/**
 * Fallback for getting mimetype from filename only using extension
 * @param filepath
 */
export const getMediaMimeType = (filepath: string): string =>
    (mediaTypes as { [key: string]: string | undefined })[
        path.extname(filepath && filepath.toLowerCase())
    ] ?? 'unknown';

/**
 * gets Mime Type from a file using unix file --mime-type, so works without file extension.
 * This is more reliable, but slower.
 * @param filepath
 */
export function getMimeType(filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const file = spawn('file', ['--mime-type', filepath]);
        let buffer = '';
        const ref = setTimeout(() => {
            file.kill();
            reject();
        }, 500);
        file.stdout.on('data', (data) => (buffer += data.toString()));
        file.on('close', (code) => {
            clearTimeout(ref);
            if (code !== 0 && !file.killed) {
                reject();
            } else if (!file.killed) {
                const [, type] = buffer.match(mimeResultPattern) || [];
                if (!type) reject();
                else resolve(type);
            }
        });
    });
}

/**
 * attempt to extract mimetype using unix file --mime-type, which does not relu on
 * file extension. If this fails, will fallback to using file extension instead.
 * @param filepath
 * @returns
 */
export async function getMimeTypeWithFallback(filepath: string): Promise<string> {
    try {
        const type = await getMimeType(filepath);
        if (type) return type;
    } catch (error) {}
    return getMediaMimeType(filepath);
}
