export type ProgressUpdate = {
    started: boolean;
    filesScanned: boolean;
    info: string;
    files: number;
    images: number;
    jpegs: number;
    pngs: number;
    stages: { name: string; info: string; progress: number; total: number }[];
};

/**
 * Message center for sending progress updates to listeners.
 * Used for sending messages back to the UI as scanning is taking place.
 * Always access through the singleton `ProgressUpdatesController.get()`
 */
class ProgressUpdatesController {
    private static shared = new ProgressUpdatesController();

    /** use for accessing shared singleton */
    public static get() {
        return this.shared;
    }

    private constructor() {}

    listeners: Map<string, Set<(update: ProgressUpdate) => void>> = new Map();

    addListener(jobId: string, callback: (update: ProgressUpdate) => void) {
        const collection = this.listeners.get(jobId) ?? new Set();
        collection.add(callback);
        if (!this.listeners.has(jobId)) this.listeners.set(jobId, collection);
    }

    removeListener(jobId: string, callback: (update: ProgressUpdate) => void) {
        this.listeners.get(jobId)?.delete(callback);
        if (this.listeners.get(jobId)?.size === 0) this.listeners.delete(jobId);
    }

    sendProgressUpdate(update: ProgressUpdate, jobId: string) {
        this.listeners.get(jobId)?.forEach((callback) => callback(update));
    }

    hasListener(jobId: string): boolean {
        return this.listeners.has(jobId);
    }
}

export default ProgressUpdatesController;
