import * as assert from 'assert';
import ProgressUpdatesController, {
    ProgressUpdate,
} from '../controllers/ProgressUpdatesController';

describe('Test ProgressUpdateController', function () {
    ///////////////////////////////////////////////////
    // Helper values and data
    ///////////////////////////////////////////////////

    const jobId1 = 'job1--ID';
    const jobId2 = 'job2--ID';

    const listener1 = () => {};
    const listener2 = () => {};

    const updateToSend: ProgressUpdate = {
        started: true,
        filesScanned: false,
        files: 100,
        images: 80,
        jpegs: 50,
        pngs: 30,
        info: 'scanning files...',
        stages: [{ name: 'test', info: 'test', progress: 10, total: 100 }],
    };

    ///////////////////////////////////////////////////
    // Tests
    ///////////////////////////////////////////////////

    it('should have a shard instance', () => {
        assert(
            ProgressUpdatesController.get() instanceof
                ProgressUpdatesController,
        );
    });

    const shared = ProgressUpdatesController.get();

    it('should add listener', () => {
        shared.addListener(jobId1, listener1);
        shared.addListener(jobId2, listener2);
    });

    it('should have listeners shared and values remain correctly alloted', () => {
        assert(shared.listeners.has(jobId1));
        assert(shared.listeners.get(jobId1)?.has(listener1));
        assert(!shared.listeners.get(jobId1)?.has(listener2));
        assert(shared.listeners.has(jobId2));
        assert(shared.listeners.get(jobId2)?.has(listener2));
        assert(!shared.listeners.get(jobId2)?.has(listener1));
    });

    it('should allow multiple listeners on a singel job without repeat', () => {
        assert.equal(shared.listeners.get(jobId1)?.size, 1);
        shared.addListener(jobId1, listener2);
        assert.equal(shared.listeners.get(jobId1)?.size, 2);
        shared.addListener(jobId1, listener1);
        shared.addListener(jobId1, listener2);
        assert.equal(shared.listeners.get(jobId1)?.size, 2);
        assert.equal(shared.listeners.get(jobId2)?.size, 1);
    });

    it('should remove listeners correctly', () => {
        assert.equal(shared.listeners.get(jobId1)?.size, 2);
        shared.removeListener(jobId1, listener2);
        assert.equal(shared.listeners.get(jobId1)?.size, 1);
        shared.removeListener(jobId1, listener2);
        assert.equal(shared.listeners.get(jobId1)?.size, 1);
        shared.removeListener(jobId1, listener1);
        assert.equal(shared.listeners.get(jobId1), undefined);
        assert.equal(shared.listeners.get(jobId2)?.size, 1);
        shared.removeListener(jobId2, listener1);
        assert.equal(shared.listeners.get(jobId2)?.size, 1);
        shared.removeListener(jobId2, listener2);
        assert.equal(shared.listeners.get(jobId2), undefined);
    });

    it('should correctly identify it has listeners for a job', () => {
        assert.equal(shared.hasListener(jobId1), false);
        shared.addListener(jobId1, listener1);
        assert.equal(shared.hasListener(jobId1), true);
        assert.equal(shared.hasListener(jobId2), false);
        shared.removeListener(jobId1, listener1);
        assert.equal(shared.hasListener(jobId1), false);
    });

    it('should notify listener of event and pass correct data', () => {
        let called = 0;
        const listener = (update: ProgressUpdate) => {
            assert.deepEqual(update, updateToSend);
            called += 1;
        };
        shared.addListener(jobId1, listener);
        shared.sendProgressUpdate(updateToSend, jobId2);
        assert.equal(called, 0);
        shared.sendProgressUpdate(updateToSend, jobId1);
        assert.equal(called, 1);
        shared.sendProgressUpdate(updateToSend, jobId1);
        assert.equal(called, 2);

        shared.removeListener(jobId1, listener);
        shared.sendProgressUpdate(updateToSend, jobId1);
        assert.equal(called, 2);
    });

    it('should notify multiple listeners on a job', () => {
        let called = 0;
        const listeners = [...new Array(10)].map(
            () => (update: ProgressUpdate) => {
                assert.deepEqual(update, updateToSend);
                called += 1;
            },
        );
        listeners.forEach((l) => shared.addListener(jobId1, l));
        assert.equal(called, 0);
        shared.sendProgressUpdate(updateToSend, jobId2);
        assert.equal(called, 0);
        shared.sendProgressUpdate(updateToSend, jobId1);
        assert.equal(called, 10);
        shared.sendProgressUpdate(updateToSend, jobId1);
        assert.equal(called, 20);
        listeners.forEach((l) => shared.removeListener(jobId1, l));
        shared.sendProgressUpdate(updateToSend, jobId1);
        assert.equal(called, 20);
        assert(!shared.hasListener(jobId1));
    });
});
