import im from 'imagemagick';
import logger from '../logger';

export type ImageDetails = {
    width: number;
    height: number;
    format: string;
    colorspace: string;
    resolution: string;
    depth: number;
};

const getInfo = (filepath: string): Promise<ImageDetails> => {
    return new Promise((resolve, reject) => {
        im.identify(['-format', '%w %h %z %[colorspace] %x %y %U %m', filepath], (err, info) => {
            if (err || !info) {
                reject(err || new Error('no image info'));
                return;
            }

            const [width, height, depth, colorspace, x, y, unit, format] = info.trim().split(' ');

            let resolution = (Number.parseFloat(x) + Number.parseFloat(y)) / 2;
            if (unit === 'PixelsPerCentimeter') {
                resolution = resolution * 2.54;
            }

            if (resolution < 1 || Number.isNaN(resolution)) {
                resolution = 72;
            }

            resolve({
                width: Number.parseFloat(width) || 0,
                height: Number.parseFloat(height) || 0,
                format: format || 'unknown',
                depth: Number.parseFloat(depth) || 0,
                colorspace: colorspace ?? 'unknown',
                resolution: `${Math.round(resolution)} ppi`,
            });
        });
    });
};

/**
 * will investigate image and gather the image details
 * like width and height
 */
async function getImageDetails(filepath: string): Promise<ImageDetails & { error: boolean }> {
    try {
        const info = await getInfo(filepath);
        return { ...info, error: false };
    } catch (error) {
        logger.error(`failed to get image details from imageMagick: ${error} for ${filepath}`, {
            id: 'getImageDetails',
        });
    }
    return {
        width: 0,
        height: 0,
        format: 'unknown',
        resolution: '72dpi',
        depth: 8,
        colorspace: 'rgb',
        error: true,
    };
}

export default getImageDetails;
