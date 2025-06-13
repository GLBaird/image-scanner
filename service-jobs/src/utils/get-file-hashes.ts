import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * Generates hashes for each file processed - MD5 and SHA1
 */
function getHashes(
    filePath: string,
    chunkSize: number = 1024 * 1024,
): Promise<{ md5: string; sha1: string }> {
    return new Promise((resolve, reject) => {
        const md5Hash = crypto.createHash('md5');
        const sha1Hash = crypto.createHash('sha1');
        const readStream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
        readStream.on('data', (chunk) => {
            md5Hash.update(chunk);
            sha1Hash.update(chunk);
        });

        readStream.on('end', () => {
            const md5 = md5Hash.digest('hex');
            const sha1 = sha1Hash.digest('hex');
            resolve({ md5, sha1 });
        });

        readStream.on('error', (error) => {
            reject(error);
        });
    });
}

export default getHashes;
