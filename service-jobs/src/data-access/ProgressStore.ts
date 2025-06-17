import ProgressUpdatesController, {
    ProgressUpdate,
} from '../controllers/ProgressUpdatesController';

export type JobProgress = {
    started: boolean;
    filesScanned: boolean;
    info: string;
    files: number;
    images: number;
    jpegs: number;
    pngs: number;
    errors: string[];
};

export type StageProgress = {
    name: string;
    info: string;
    progress: number;
    total: number;
    errors: string[];
};

/**
 * Store for managing file scan updates, and monitor progress for UI updates, and also,
 * when the job has completed for updating the DB. Also, can run an update timer (based on
 * updateInterval, which is every 1.5s, will cancel if idel for idelInterval, which defaults to 30s)
 * Updates will be issued to the ProgressUpdatesController, so any listeners will receive this data.
 * Used for sending data to the UI via sockets or SSE if anyone is listening.
 */
class ProgressStore {
    private static shared = new ProgressStore();

    /** accessor for shared singleton */
    public static get() {
        return this.shared;
    }

    private constructor() {}

    /** update timer ref @private */
    private timerRef: NodeJS.Timeout | undefined;
    /** idle timer ref @private */
    private idleRef: NodeJS.Timeout | undefined;

    /** Interval between updates in milliseconds */
    public updateInterval = 1500;
    /** Interval in milliseconds before updates stop if service is idle */
    public idleInterval = 30000; // interval to stop updates over

    /** job progress info for each job @private */
    private jobProgress: Map<string, JobProgress> = new Map();
    /** stage progress info for each job @private */
    private stageProgress: Map<string, StageProgress> = new Map();
    /** tasks progress info for each job to monitor completeness @private */
    private jobTasks: Map<string, number> = new Map();

    /** array of inflight jobs @private */
    private jobs: Set<string> = new Set();
    /** stages processed @private */
    private stages: Set<string> = new Set();

    /**
     * Helper for making references for the stages in stageProgress
     * @private
     */
    private makeStageRef(jobId: string, name: string): string {
        return `${jobId}/${name}`;
    }

    /**
     * get access to progress info for a job's scan
     * @param jobId
     * @returns
     */
    public getScanProgress(jobId: string): JobProgress | undefined {
        return this.jobProgress.get(jobId);
    }

    /**
     * Returns bool if the store is currently issuing updates
     * @returns
     */
    public isUpdating(): boolean {
        return this.timerRef !== undefined;
    }

    /**
     * Returns bool if job has completed based on number of tasks remaining
     * @param jobId
     * @returns
     */
    public isJobComplete(jobId: string): boolean {
        return this.jobTasks.get(jobId) === 0;
    }

    /**
     * Increments number of tasks to be completed on a job by count.
     * When tasks reach 0, job is marked as completed.
     * Based on the number of images to process for each stage.
     * @private
     */
    private incrementJobTasks(jobId: string, count: number) {
        this.jobTasks.set(jobId, (this.jobTasks.get(jobId) ?? 0) + count);
    }

    /**
     * Decrement tasks by a count of 1, called everytime a stage is updated.
     * @private
     */
    private decrementJobTasks(jobId: string) {
        if (!this.jobTasks.has(jobId)) return;
        this.jobTasks.set(jobId, this.jobTasks.get(jobId)! - 1);
    }

    /**
     * Will start update timer to send progress to any listeners
     * via ProgressUpdatesController.
     */
    public startUpdates() {
        if (this.isUpdating()) return;
        this.timerRef = setInterval(this.sendUpdates.bind(this), this.updateInterval);
    }

    /**
     * Will stop any upates and cancel timers.
     */
    public stopUpdates() {
        clearInterval(this.timerRef);
        clearTimeout(this.idleRef);
        this.timerRef = undefined;
        this.idleRef = undefined;
    }

    /**
     * Will send updates to any listeners via ProgressUpdatesController
     * @private
     */
    private sendUpdates() {
        const jobs = [...this.jobs].filter((jobId) =>
            ProgressUpdatesController.get().hasListener(jobId),
        );
        const updates: { id: string; update: ProgressUpdate }[] = jobs
            .map((jobId) => {
                const jobProgress = this.jobProgress.get(jobId);
                if (jobProgress === undefined) return undefined;
                const stageProgress = [...this.stages]
                    .map((stage) => this.stageProgress.get(this.makeStageRef(jobId, stage)))
                    .filter((progress) => progress !== undefined);
                return {
                    id: jobId,
                    update: {
                        ...jobProgress,
                        stages: stageProgress,
                    },
                };
            })
            .filter((update) => update !== undefined);
        updates.forEach((info) =>
            ProgressUpdatesController.get().sendProgressUpdate(info.update, info.id),
        );
    }

    /**
     * Add a new job for monitoring progress.
     * @param jobId
     * @param started has the scan already started? default false.
     * @returns
     */
    public addJob(jobId: string, started: boolean = false) {
        this.jobs.add(jobId);
        if (this.jobProgress.has(jobId)) return;
        this.jobProgress.set(jobId, {
            started,
            filesScanned: false,
            info: started ? 'scan started' : 'scan pending...',
            files: 0,
            images: 0,
            jpegs: 0,
            pngs: 0,
            errors: [],
        });
    }

    /**
     * Reports if a store for this job exists
     * @param jobId
     * @returns
     */
    public hasJob(jobId: string): boolean {
        return this.jobs.has(jobId);
    }

    /**
     * Updates idle timer, which resets to idleInterval for cancelling updates
     * @private
     */
    private updateIdleTimer() {
        if (this.idleRef) clearTimeout(this.idleRef);
        this.idleRef = setTimeout(this.stopUpdates.bind(this), this.idleInterval);
    }

    /**
     * Marks a job as started and creates default progress data if not already added.
     * @param jobId
     */
    public startJob(jobId: string) {
        if (!this.jobProgress.get(jobId)) this.addJob(jobId, true);
        else this.jobProgress.get(jobId)!.started = true;
        this.startUpdates();
    }

    /**
     * Called with data regarding current filescan progress.
     * @param jobId
     * @param fileInfo info about the current file scanned.
     * @param completed has the filescan completed?
     */
    public updateForFileScan(
        jobId: string,
        fileInfo: { filepath: string; type: 'jpeg' | 'png' | 'any' },
        completed: boolean = false,
    ) {
        let progress = this.jobProgress.get(jobId);
        if (!progress) {
            this.addJob(jobId, true);
            progress = this.jobProgress.get(jobId)!;
        }
        progress.filesScanned = completed;
        progress.files = progress.files += 1;
        if (fileInfo.type === 'png') progress.pngs += 1;
        if (fileInfo.type === 'jpeg') progress.jpegs += 1;
        if (fileInfo.type !== 'any') progress.images += 1;
        progress.info = fileInfo.filepath;
        this.updateIdleTimer();
    }

    /**
     * Register error during readdir scan stage
     * @param jobId
     * @param error
     * @returns
     */
    public registerFileScanError(jobId: string, error: string) {
        let progress = this.jobProgress.get(jobId);
        if (!progress) return;
        progress.errors.push(error);
        this.updateIdleTimer();
    }

    /**
     * Marks filescan for job as completed if not marking scan completed
     * via updatgesForFileScan.
     * @param jobId
     */
    public completeFileScan(jobId: string) {
        let progress = this.jobProgress.get(jobId);
        if (!progress) return;
        progress.filesScanned = true;
    }

    /**
     * Adds a new stage for a job.
     * @param jobId
     * @param name Name of stage.
     * @param count How many tasks / images will be processed for monitoring progress.
     */
    public startNewStage(jobId: string, name: string, count: number) {
        this.stages.add(name);
        this.stageProgress.set(this.makeStageRef(jobId, name), {
            name,
            info: 'scan pending...',
            progress: 0,
            total: count,
            errors: [],
        });
        this.incrementJobTasks(jobId, count);
    }

    /**
     * Used to increment total number of tasks on a stage.
     * Best to set when creating a stage, but if waiting for streaming data, can
     * then set as data stream and incrememnt as needed
     * @param jobId
     * @param name
     * @returns
     */
    public incrementStageCount(jobId: string, name: string, count: number = 1) {
        const stage = this.stageProgress.get(this.makeStageRef(jobId, name));
        if (!stage) return;
        stage.total += count;
    }

    /**
     * Will update progress on each stage for UI updates and if entire job has completed.
     * Will return true if all tasks for a job have been done.
     * @param jobId
     * @param stage Name of stage being updated.
     * @param filepath File currently being processed.
     * @returns True if all tasks for job have been completed.
     */
    public updateForStage(jobId: string, stage: string, filepath: string): boolean {
        let stageProgress = this.stageProgress.get(this.makeStageRef(jobId, stage));
        if (!stageProgress) {
            // if stage data missing, getnumber of images or fictional number to show some progress in the UI
            this.startNewStage(jobId, stage, this.jobProgress.get(jobId)?.images ?? 10000);
            stageProgress = this.stageProgress.get(this.makeStageRef(jobId, stage))!;
        }
        stageProgress.info = filepath;
        stageProgress.progress += 1;

        this.updateIdleTimer();
        this.decrementJobTasks(jobId);
        return this.isJobComplete(jobId);
    }

    /**
     * Register error during stage process
     * @param jobId
     * @param stage
     * @param error
     * @returns
     */
public registerStageError(jobId: string, stage: string, error: string) {
        let stageProgress = this.stageProgress.get(this.makeStageRef(jobId, stage));
        if (!stageProgress) return;
        stageProgress.errors.push(error);
        this.updateIdleTimer();
    }

    /**
     * Will remove all progress data for a job and stop updates if no more progress is available.
     * Updates will also stop if progress is idle for 30s.
     * @param jobId
     */
    public removeJob(jobId: string) {
        this.jobs.delete(jobId);
        this.jobProgress.delete(jobId);
        this.stages.forEach((stage) => this.stageProgress.delete(this.makeStageRef(jobId, stage)));
        this.jobProgress.delete(jobId);
        if (this.jobs.size === 0) {
            this.stopUpdates();
        }
    }
}

export default ProgressStore;
