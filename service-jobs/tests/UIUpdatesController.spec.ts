import * as request from 'supertest';
import * as assert from 'assert';
import { request as httpRequest } from 'http';
import { once } from 'events';
import { EventSource } from 'eventsource';
import ServerSideEventEmitter from '../controllers/ServerSideEventEmitter';
import ProgressUpdatesController, {
    ProgressUpdate,
} from '../controllers/ProgressUpdatesController';
import UIUpdatesController from '../controllers/UIUpdatesController';

describe('Test UIUpdatesController with ProgressUpdatesController integration', function () {
    this.timeout(5000);

    const sse = ServerSideEventEmitter.get();
    const puc = ProgressUpdatesController.get();
    const uuc = UIUpdatesController.get();

    sse.httpPort = 4090;
    sse.httpsPort = 4095;
    const port = sse.httpPort;

    before((done) => {
        sse.startServer();
        setTimeout(done, 1000);
        uuc._resetSseListener();
    });

    after(async () => {
        sse._resetForTests();
        await sse.stopServer();
    });

    it('should send event to listner via SSE from ProgressUpdatesController', (done) => {
        const jobId = 'job-42';
        const es = new EventSource(`http://localhost:${port}/events/${jobId}`);

        assert(uuc.serviceReady(), 'service is ready');

        const update: ProgressUpdate = {
            started: true,
            filesScanned: true,
            files: 100,
            images: 80,
            jpegs: 70,
            pngs: 10,
            info: 'testing...',
            stages: [],
        };

        /** allow done() to be called exactly once */
        let finished = false;
        const finish = (err?: any) => {
            if (finished) return;
            finished = true;
            es.close(); // tidy up the connection
            done(err);
        };

        es.onerror = (evt) => {
            // wrap non-Error payloads so Mocha prints a stack
            const err =
                evt instanceof Error ? evt : new Error(`EventSource error: ${JSON.stringify(evt)}`);
            finish(err);
        };

        es.onopen = () => {
            assert(puc.hasListener(jobId), 'is puc ready with listener');
            puc.sendProgressUpdate(update, jobId);
        };

        es.onmessage = (evt) => {
            try {
                assert.deepStrictEqual(JSON.parse(evt.data), update, 'update data must match');
                finish(); // success
            } catch (e) {
                finish(e); // assertion failed
            }
        };
    });
});
