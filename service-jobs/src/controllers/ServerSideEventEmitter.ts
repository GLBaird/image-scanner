import * as express from 'express';
import { Express } from 'express';
import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';
import { IncomingMessage, ServerResponse } from 'http';
import type { Socket } from 'net';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as cors from 'cors';
import { EventEmitter } from 'events';
import config from '../configs/server';
import logger, { getLoggerMetaFactory } from '../logger';

const key = fs.readFileSync(__dirname + '/../../certs/server.key');
const cert = fs.readFileSync(__dirname + '/../../certs/server.crt');
const credentials = { key, cert };

const makeLogId = getLoggerMetaFactory('ServerSideEventEmitter');

export type ServerSideEventListener = (jobId: string, event: 'open' | 'close') => void;

class ServerSideEventEmitter {
    private static shared: ServerSideEventEmitter = new ServerSideEventEmitter();
    private app = express();
    private http: HttpServer<typeof IncomingMessage, typeof ServerResponse>;
    private https: HttpsServer<typeof IncomingMessage, typeof ServerResponse>;
    private sockets = new Set<Socket>();
    private bus = new EventEmitter();
    private running = false;

    private eventListeners: Set<ServerSideEventListener> = new Set();

    public addEventListener(listener: ServerSideEventListener) {
        logger.debug(`adding event listener ${listener.name}`, makeLogId('addEventListener'));
        this.eventListeners.add(listener);
    }

    public removeEventListener(listener: ServerSideEventListener) {
        logger.debug(`removing event listener ${listener.name}`, makeLogId('removeEventListener'));
        if (this.eventListeners.has(listener)) {
            this.eventListeners.delete(listener);
        }
    }

    public sendMessage(jobId: string, data: any) {
        logger.debug(`sending message ${jobId}L ${data}`, makeLogId('sendMessage'));
        this.bus.emit('message', { jobId, data });
    }

    public httpPort = parseInt(config.serverSideEventsPort.http) ?? 4042;
    public httpsPort = parseInt(config.serverSideEventsPort.https) ?? 4042;

    /**
     * Get singleton instance of ServerSideEventEmitter
     * @returns
     */
    public static get(): ServerSideEventEmitter {
        return this.shared;
    }

    private constructor() {
        const logId = makeLogId('constructor');
        logger.info('initialising server side events emitter', logId);

        this.app.use(
            cors({
                origin: config.frontend.origin,
            }),
        );

        this.http = http.createServer(this.app);
        this.https = https.createServer(credentials, this.app);

        logger.info(
            `cross origin for server side events to frontend: ${config.frontend.origin}`,
            logId,
        );

        this.app.get('/ping', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.json({ status: 'ok' });
        });

        this.app.get('/events/:jobId', (req, res) => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.write(': connected\n\n');
            const { jobId } = req.params;

            // res.flushHeaders();

            /** helper: send a JSON chunk */
            const send = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`);
            const onMessage = (payload: { jobId: string; data: any }) => {
                if (payload.jobId === jobId) send(payload.data);
            };
            this.bus.on('message', onMessage);

            logger.debug(`sending message to listeners: ${this.eventListeners}`, logId);
            this.eventListeners.forEach((listener) => listener(jobId, 'open'));

            // tidy up when the client goes away
            req.on('close', () => {
                this.bus.off('message', onMessage);
                res.end();
                this.eventListeners.forEach((listener) => listener(jobId, 'close'));
            });
        });

        // capture sockets on both HTTP and HTTPS servers
        const addTracker = (srv: HttpServer | HttpsServer | undefined) => {
            srv?.on('connection', (sock: Socket) => {
                this.sockets.add(sock);
                sock.on('close', () => this.sockets.delete(sock));
            });
        };

        addTracker(this.http);
        addTracker(this.https);

        logger.info('server ready for SSE', logId);
    }

    /**
     * Starts server for sending events
     */
    startServer() {
        if (this.running) return;
        this.running = true;
        const logId = makeLogId('startServer');
        logger.info('starting Server Side Events Emitter for UI updates');

        this.http?.listen(this.httpPort, () =>
            logger.info(`SSE http-server listening on port ${this.httpPort}`),
        );
        this.https?.listen(this.httpsPort, () =>
            logger.info(`SSE https-server listening on port ${this.httpsPort}`),
        );
    }

    /**
     * Stops the server - used in tests
     */
    async stopServer() {
        const logId = makeLogId('stopServer');
        logger.info('stopping server and destrouing connections');

        // 1  destroy every socket
        for (const s of this.sockets) s.destroy();
        this.sockets.clear();

        // 2  now close the listeners
        await Promise.all([
            this.http && new Promise<void>((r) => this.http!.close(() => r())),
            this.https && new Promise<void>((r) => this.https!.close(() => r())),
        ]);

        this.bus.removeAllListeners();
        this.eventListeners.clear();
        this.running = false;
    }

    /**
     * Get Express app for connecting to SUPERTEST
     * @returns
     */
    public getExpressApp(): Express {
        return this.app;
    }

    /**
     * Reset all listeners and clear event bus
     */
    public _resetForTests() {
        logger.debug(`resetting service for tests`, makeLogId('_resetForTests'));
        this.bus.removeAllListeners();
        this.eventListeners.clear();
    }
}

export default ServerSideEventEmitter;
