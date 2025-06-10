import logger, { getLoggerMetaFactory } from '../logger';
import ProgressUpdatesController, { ProgressUpdate } from './ProgressUpdatesController';
import ServerSideEventEmitter, { ServerSideEventListener } from './ServerSideEventEmitter';

const makeLogId = getLoggerMetaFactory('UIUpdatesController');

class UIUpdatesController {
    private static shared = new UIUpdatesController();

    public static get(): UIUpdatesController {
        return this.shared;
    }

    private jobListeners: string[] = [];
    private boundListeners: Map<string, (update: ProgressUpdate) => void> = new Map();
    private socketUpdatesInitialised = false;

    private constructor() {
        const sse = ServerSideEventEmitter.get();
        sse.addEventListener(this.socketUpdate.bind(this));
        this.socketUpdatesInitialised = true;
        logger.info('UI Updates Controller ready', makeLogId('constructor'));
    }

    public socketUpdate(jobId: string, event: 'open' | 'close') {
        const logId = makeLogId('socketUpdate');
        if (event === 'open' && !this.activeListenersForJob(jobId)) {
            const puc = ProgressUpdatesController.get();
            this.boundListeners.set(jobId, this.updatesListener.bind(this, jobId));
            puc.addListener(jobId, this.boundListeners.get(jobId)!);
            logger.debug(`added progress listener for job ${jobId}`, logId);
        }
        switch (event) {
            case 'open':
                this.jobListeners.push(jobId);
                break;
            case 'close':
                const index = this.jobListeners.indexOf(jobId);
                this.jobListeners.splice(index, 1);
                break;
            default:
                logger.error(`unknown socket event: ${event}`, logId);
        }

        if (
            event === 'close' &&
            !this.activeListenersForJob(jobId) &&
            this.boundListeners.has(jobId)
        ) {
            const puc = ProgressUpdatesController.get();
            puc.removeListener(jobId, this.boundListeners.get(jobId)!);
            this.boundListeners.delete(jobId);
            logger.debug(`removed progress listener for job ${jobId}`, logId);
        }

        const count = this.jobListeners.filter((id) => id === jobId).length;
        const state = event === 'open' ? 'opened' : 'closed';
        logger.debug(`socket ${state} for job: ${jobId} - now ${count} listeners`, logId);
    }

    public activeListenersForJob(jobId: string) {
        return this.jobListeners.includes(jobId);
    }

    private updatesListener(jobId: string, update: ProgressUpdate) {
        const sse = ServerSideEventEmitter.get();
        sse.sendMessage(jobId, update);
        logger.debug(`sending ui update for job ${jobId}: ${update}`, makeLogId('updatesListener'));
    }

    public serviceReady() {
        return this.socketUpdatesInitialised;
    }

    public _resetSseListener() {
        const sse = ServerSideEventEmitter.get();
        sse._resetForTests();
        sse.addEventListener(this.socketUpdate.bind(this));
    }
}

export default UIUpdatesController;
