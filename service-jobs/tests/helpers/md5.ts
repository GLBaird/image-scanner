import { Buffer } from 'buffer';
import * as crypto from 'crypto';

function getMd5Hash(buffer: Buffer): string {
    const md5Hash = crypto.createHash('md5');
    md5Hash.update(buffer);
    return md5Hash.digest('hex');
}

export default getMd5Hash;
