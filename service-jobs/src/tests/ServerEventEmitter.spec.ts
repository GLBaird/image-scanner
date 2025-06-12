import request from 'supertest';
import assert from 'assert';
import { request as httpRequest } from 'http';
import { once } from 'events';
import { EventSource } from 'eventsource';
import ServerSideEventEmitter from '../controllers/ServerSideEventEmitter';

describe('Test server Event Emitter', function () {
    this.timeout(5000);

    const sse = ServerSideEventEmitter.get();
    sse.httpPort = 4090;
    sse.httpsPort = 4095;
    const port = sse.httpPort;

    before((done) => {
        sse.startServer();
        setTimeout(done, 1000);
    });

    this.afterEach(() => sse._resetForTests());

    after(async () => await sse.stopServer());

    it('should ping', async () => {
        await request(sse.getExpressApp())
            .get('/ping')
            .expect(200)
            .expect('Content-Type', 'application/json; charset=utf-8')
            .expect((res) => {
                assert.equal(res.body.status, 'ok');
            });
    });

    it('exposes /events/:jobId with the correct SSE headers', async () => {
        const req = httpRequest({ host: 'localhost', port, path: '/events/foo' });
        req.end(); // fire the GET

        const [res] = await once(req, 'response'); // headers ready
        assert.equal(res.statusCode, 200);
        assert.match(res.headers['content-type'], /text\/event-stream/);
        assert.equal(res.headers['cache-control'], 'no-cache');
        assert.equal(res.headers['connection'], 'keep-alive');

        req.destroy();
    });

    it('delivers a message only to the matching jobId', (done) => {
        const jobId = 'job-42';
        const es = new EventSource(`http://localhost:${port}/events/${jobId}`);

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
            const err = evt instanceof Error ? evt : new Error(`EventSource error: ${evt}`);
            finish(err);
        };

        es.onopen = () => {
            // message for this client →
            sse.sendMessage(jobId, { hello: 'world' });
            // message for some other job – must be ignored
            sse.sendMessage('otherJob', { secret: 123 });
        };

        es.onmessage = (evt) => {
            try {
                assert.deepStrictEqual(JSON.parse(evt.data), { hello: 'world' });
                finish(); // success
            } catch (e) {
                finish(e); // assertion failed
            }
        };
    });

    it('calls registered listeners on open and close', (done) => {
        const jobId = 'job-listener';
        let opened = false;
        let closed = false;

        const listener = (jid: string, ev: 'open' | 'close') => {
            assert.equal(jid, jobId);
            if (ev === 'open') opened = true;
            if (ev === 'close') closed = true;
            if (opened && closed) {
                sse.removeEventListener(listener);
                done();
            }
        };

        sse.addEventListener(listener);

        const es = new EventSource(`http://localhost:${port}/events/${jobId}`);
        es.onopen = () => es.close(); // close immediately to trigger both events
    });
});
