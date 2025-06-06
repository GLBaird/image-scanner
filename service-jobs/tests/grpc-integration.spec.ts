import * as assert from 'assert';
import { JobManagerControllerClient } from '../generated/jobmanager/JobManagerController';
import getTestClient from './helpers/grpc-client';

describe('gRPC Integration Test', function () {
    this.timeout(5000);
    let client: JobManagerControllerClient;

    before(async () => {
        client = await getTestClient();
    });

    after(async () => {
        client.close();
    });

    it('should run tests', async () => {
        const a = 'a';
        assert.equal(a, 'a');
    });
});
