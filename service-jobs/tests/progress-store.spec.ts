import * as assert from 'assert';
import ProgressUpdatesController, {
    ProgressUpdate,
} from '../src/controllers/ProgressUpdatesController';
import ProgressStore from '../src/data-access/ProgressStore';
import pause from './helpers/pause';

type Images = 'jpeg' | 'png' | 'any';

describe('Test ProgressStore', function () {
    this.timeout(20000);

    ///////////////////////////////////////////////////
    // Helper values and data
    ///////////////////////////////////////////////////

    const progress = ProgressUpdatesController.get();
    const store = ProgressStore.get();

    const job1 = 'id-1-job';
    const stage1 = 'id-1-stage';
    const stage2 = 'id-2-stage';
    const stage1Count = 400;
    const stage2Count = 100;

    ///////////////////////////////////////////////////
    // Helper functions
    ///////////////////////////////////////////////////

    function getRandomFileType() {
        const index = Math.round(Math.random() * 2);
        return ['png', 'jpeg', 'any'][index] as Images;
    }

    const generateScannedFiles = (count: number) =>
        [...new Array(count)].map((_, index) => ({
            type: getRandomFileType(),
            filepath: `image_${index}`,
        }));

    const getStats = (files: { type: Images }[]) =>
        files.reduce((acc, val) => ({ ...acc, [val.type]: acc[val.type] + 1 }), {
            jpeg: 0,
            png: 0,
            any: 0,
        });

    let updateCount = 0;
    let lastUpdate: ProgressUpdate | undefined;

    const listener = (update: ProgressUpdate) => {
        updateCount += 1;
        lastUpdate = update;
    };

    ///////////////////////////////////////////////////
    // Tests
    ///////////////////////////////////////////////////

    before(() => {
        progress.addListener(job1, listener);
    });

    after(() => {
        store.stopUpdates();
        store.removeJob(job1);
        progress.removeListener(job1, listener);
    });

    it('should be in initial state', () => {
        assert.equal(store.isUpdating(), false);
        assert.equal(store.isJobComplete(job1), false);
    });

    it('should add new job', () => {
        store.addJob(job1);
        assert(store.hasJob(job1));
        assert(!store.hasJob('made-up-ref'));
    });

    it('should allow progress interval timer to change', () => {
        store.updateInterval = 5;
        store.idleInterval = 20;
    });

    const getWaitTime = (count: number) => 5 * count;

    it('should start jobs and update with progress', async () => {
        assert.equal(updateCount, 0);
        assert.equal(lastUpdate, undefined);
        assert(store.hasJob(job1));

        store.startJob(job1);
        await pause(getWaitTime(1));
        assert.equal(updateCount, 1);
        assert(lastUpdate);
        assert.equal(lastUpdate.started, true);
        assert.equal(lastUpdate.filesScanned, false);
        assert.equal(lastUpdate.files, 0);
        assert.equal(lastUpdate.images, 0);
        assert.equal(lastUpdate.jpegs, 0);
        assert.equal(lastUpdate.pngs, 0);
        assert.equal(lastUpdate.info, 'scan pending...');
        assert.equal(lastUpdate.stages.length, 0);

        updateCount = 0;
        // wait for 4 updates or more
        await pause(getWaitTime(5));
        assert(updateCount >= 4);

        updateCount = 0;

        // scan 100 files and generate stats
        const files = generateScannedFiles(100);
        const stats = getStats(files);

        files.forEach((file) => store.updateForFileScan(job1, file));
        await pause(getWaitTime(1));
        assert.equal(updateCount, 1);
        assert.equal(lastUpdate.started, true);
        assert.equal(lastUpdate.filesScanned, false);
        assert.equal(lastUpdate.files, 100);
        assert.equal(lastUpdate.images, 100 - stats.any);
        assert.equal(lastUpdate.jpegs, stats.jpeg);
        assert.equal(lastUpdate.pngs, stats.png);
        assert.equal(lastUpdate.info, files.slice(-1).pop()!.filepath);
        assert.equal(lastUpdate.stages.length, 0);
        // scan 100 more and mark final image as completing scan
        files.forEach((file, index) => store.updateForFileScan(job1, file, index === 99));
        await pause(getWaitTime(1));
        assert.equal(updateCount, 2);
        assert.equal(lastUpdate.files, 200);
        assert(lastUpdate.filesScanned);

        // start two stages
        updateCount = 0;
        store.startNewStage(job1, stage1, stage1Count);
        store.startNewStage(job1, stage2, stage2Count);
        await pause(getWaitTime(1));
        assert.equal(updateCount, 1);
        assert.equal(lastUpdate.stages.length, 2);
        let stage1Update = lastUpdate.stages.find((s) => s.name === stage1);
        let stage2Update = lastUpdate.stages.find((s) => s.name === stage2);
        assert(stage1Update && stage2Update);
        assert.equal(stage1Update.name, stage1);
        assert.equal(stage1Update.info, 'scan pending...');
        assert.equal(stage1Update.progress, 0);
        assert.equal(stage1Update.total, stage1Count);
        assert.equal(stage2Update.name, stage2);
        assert.equal(stage2Update.info, 'scan pending...');
        assert.equal(stage2Update.progress, 0);
        assert.equal(stage2Update.total, stage2Count);

        // update half the progress stage 1 and full stage 2
        [...new Array(stage1Count / 2)].forEach((_, index) =>
            store.updateForStage(job1, stage1, `file_s1_${index}`),
        );
        [...new Array(stage2Count)].forEach((_, index) =>
            store.updateForStage(job1, stage2, `file_s2_${index}`),
        );
        await pause(getWaitTime(1));
        assert.equal(updateCount, 2);
        assert.equal(lastUpdate.stages.length, 2);
        stage1Update = lastUpdate.stages.find((s) => s.name === stage1);
        stage2Update = lastUpdate.stages.find((s) => s.name === stage2);
        assert(stage1Update && stage2Update);
        assert.equal(stage1Update.name, stage1);
        assert.equal(stage1Update.info, `file_s1_${stage1Count / 2 - 1}`);
        assert.equal(stage1Update.progress, stage1Count / 2);
        assert.equal(stage1Update.total, stage1Count);
        assert.equal(stage2Update.name, stage2);
        assert.equal(stage2Update.info, `file_s2_${stage2Count - 1}`);
        assert.equal(stage2Update.progress, stage2Count);
        assert.equal(stage2Update.total, stage2Count);

        // check should not be complete
        assert.equal(store.isJobComplete(job1), false);
        assert(store.isUpdating());

        // update rest of stage 1 progress
        [...new Array(stage1Count / 2)].forEach((_, index) => {
            const complete = store.updateForStage(
                job1,
                stage1,
                `file_s1_${index + stage1Count / 2}`,
            );
            assert.equal(complete, index === stage1Count / 2 - 1);
        });
        await pause(getWaitTime(1));
        assert.equal(updateCount, 3);
        assert.equal(lastUpdate.stages.length, 2);
        stage1Update = lastUpdate.stages.find((s) => s.name === stage1);
        assert(stage1Update);
        assert.equal(stage1Update.info, `file_s1_${stage1Count - 1}`);
        assert.equal(stage1Update.progress, stage1Count);
        assert.equal(stage1Update.total, stage1Count);

        // job should be complete
        assert(store.isJobComplete(job1));

        // wait for idle timer to lapse
        assert.equal(store.isUpdating(), true);
        await pause(25);
        assert.equal(store.isUpdating(), false);
    });

    it('should remove job', () => {
        assert(store.hasJob(job1));
        store.removeJob(job1);
        assert(!store.hasJob(job1));
    });

    it('should be able to start and stop updates', () => {
        assert(!store.isUpdating());
        store.startUpdates();
        assert(store.isUpdating());
        store.stopUpdates();
        assert(!store.isUpdating());
    });
});
