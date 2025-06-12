import { Stats } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import readdir from 'readdir-enhanced';
import logger, { getLoggerMetaFactory } from '../logger';
import { Timestamp } from '../generated/google/protobuf/Timestamp';
import { toTimestamp } from '../utils/timestamp';
import Stream from 'stream';

const makeLogId = getLoggerMetaFactory('SourceController');

const SOURCE_FOLDER = process.env.SOURCE_FOLDER ?? path.resolve(__dirname, '..', 'sources');
logger.info(`Source folder set to: ${SOURCE_FOLDER}`, makeLogId('init'));

const filterDirs = (file: Stats) => file.isDirectory();
const filterFileBySize =
    (minFileSize: number = 100) =>
    (file: Stats) =>
        file.isFile() && file.size >= minFileSize;

export type FileInfo = {
    pathname: string;
    filename: string;
    size: string; // MB
    creationDate: Date;
};

export type SourceInfo = {
    name: string;
    createdAt: Timestamp;
    modifiedAt: Timestamp;
};

/**
 * Callback for readdir info, either FileInfo for file data, string for any errors, or undefined and
 * completed true if end of scan.
 */
export type ScannerCallback = (
    fileInfo: FileInfo | string | undefined,
    completed: boolean,
) => void | Promise<void>;

export type ScannerJob = {
    location: string;
    minFileSize: number;
    callback: ScannerCallback;
};

class SourceController {
    private static pendingSources: ScannerJob[] = [];
    private static activeSource?: string;
    private static activeStream?: Stream.Readable;

    /** get source folder path */
    static sourcePath(): string {
        return SOURCE_FOLDER;
    }

    /**
     * scans source folder for DIRs - only reads the source DIR and does not go into the file tree below
     * @returns array of SourceInfo
     */
    static async getSources(): Promise<SourceInfo[]> {
        const dirsInfo = await readdir.async(SOURCE_FOLDER, {
            filter: filterDirs,
            stats: true,
        });
        return dirsInfo
            .map((dir) => ({
                name: dir.path,
                createdAt: toTimestamp(dir.ctime),
                modifiedAt: toTimestamp(dir.mtime),
            }))
            .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    }

    /**
     * Start scannig process with callbacks of file-info
     * @param location      filepath of directory to scan within source folder
     * @param minFileSize   min file size in bytes
     * @param callback      callback for fileinfo when found
     * @returns             state of pending, started or already in progress
     */
    static async scanSource(
        location: string,
        minFileSize: number,
        callback: ScannerCallback,
    ): Promise<'pending' | 'started' | 'in-progress' | 'source-missing'> {
        if (this.activeSource && this.activeSource === location) {
            return 'in-progress';
        }
        if (this.activeSource && this.pendingSources.find((s) => s.location === location)) {
            return 'pending';
        }
        if (this.activeSource) {
            this.pendingSources.push({ location, minFileSize, callback });
            logger.info(
                `new scan source added to pending, currently ${this.pendingSources.length} job(s).`,
            );
            return 'pending';
        }
        this.activeSource = location;
        const logId = makeLogId('scanSource');
        logger.info(`starting file scan: ${location}, min file size: ${minFileSize}b`, logId);

        const filepath = path.resolve(SOURCE_FOLDER, location);

        // check exists and is a dir
        try {
            const pathStats = await stat(filepath);
            if (!pathStats.isDirectory()) {
                logger.error(
                    `can scan source: ${filepath} - does not exist or not as directory`,
                    logId,
                );
                return 'source-missing';
            }
        } catch (error) {
            logger.error(
                `cannot get stats for source DIR - may not exists: ${filepath}, ${error}`,
                logId,
            );
            return 'source-missing';
        }

        // start scanning directory
        this.activeStream = readdir.stream(filepath, {
            deep: true,
            stats: true,
            filter: filterFileBySize(minFileSize),
        });

        this.activeStream.on('data', async (stats: Stats & { path: string }) => {
            const result = callback(
                {
                    filename: path.basename(stats.path),
                    pathname: '/' + path.join(location, stats.path),
                    creationDate: stats.ctime,
                    size: (stats.size / 1024 / 1024).toFixed(2), // size in megabytes (MiB, i.e. 1024²)
                },
                false,
            );
            if (result instanceof Promise) await result;
        });

        this.activeStream.on('error', async (error) => {
            logger.error(
                `error scanning source: ${location}, error: ${error.message ?? error}`,
                logId,
            );
            const result = callback(error.message ?? `${error}`, false);
            if (result instanceof Promise) await result;
        });

        this.activeStream.on('end', () => {
            callback(undefined, true);
            this.nextJob();
        });

        return 'started';
    }

    private static nextJob() {
        const logId = makeLogId('nextJob');
        logger.info(`scanning source completed: ${this.activeSource}`, logId);
        this.activeStream?.destroy();
        this.activeStream = undefined;
        this.activeSource = undefined;
        const nextJob = this.pendingSources.shift();
        if (!nextJob) return;
        const { location, minFileSize, callback } = nextJob;
        this.activeSource = location;
        this.scanSource(location, minFileSize, callback);
        logger.info(`scanning next source, ${this.pendingSources.length} jobs pending.`, logId);
    }

    /**
     * Can be used to pause an active stream while scanning a folder
     * @returns boolean if stream exists and is paused
     */
    static pauseStream(): boolean {
        this.activeStream?.pause();
        return this.activeStream?.isPaused() ?? false;
    }

    /**
     * Can be used to resume a paused stream to continue scanning
     * @returns boolean if stream exists and has resumed
     */
    static resumeStream(): boolean {
        if (this.activeStream?.isPaused()) {
            this.activeStream.resume();
            return !this.activeStream.isPaused();
        }
        return false;
    }

    /**
     * Checks if an active stream exists and is paused
     * @returns
     */
    static streamIsPaused(): boolean {
        return this.activeStream?.isPaused() ?? false;
    }

    /**
     * Checks if a stream exists for scanning as in currently active
     * @returns
     */
    static isActive(): boolean {
        return this.activeStream !== undefined && !this.activeStream.isPaused();
    }
}

export default SourceController;
