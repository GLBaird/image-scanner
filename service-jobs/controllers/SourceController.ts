import path from 'path';
import { readdir } from 'fs/promises';

export type Source = {
    location: string;
    jobId: string;
};

const SOURCE_FOLDER = path.resolve(__dirname, '..', 'sources');

class SourceController {
    static pendingSources: Source[] = [];
    static activeSource?: Source;

    static async getSources(): string[] {
        const files = await readdir(SOURCE_FOLDER);
    }

    static scanSource(location: string, jobId: string) {}
}
