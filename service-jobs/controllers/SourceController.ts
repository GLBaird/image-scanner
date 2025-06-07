import { Stats } from 'fs';
import path from 'path';
import readdir from 'readdir-enhanced';

const SOURCE_FOLDER = path.resolve(__dirname, '..', 'sources');

const filterDirs = (file: Stats) => file.isDirectory();
const filterFile = (file: Stats) => file.isFile();

export type Source = {
    location: string;
    jobId: string;
};

class SourceController {
    static pendingSources: Source[] = [];
    static activeSource?: Source;

    static async getSources(): Promise<string[]> {
        return await readdir.async(SOURCE_FOLDER, { filter: filterDirs });
    }

    static scanSource(location: string, jobId: string) {}
}
