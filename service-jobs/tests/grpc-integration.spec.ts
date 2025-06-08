import * as assert from 'assert';
import { Metadata } from '@grpc/grpc-js';
import { v4 as uuid } from 'uuid';
import { JobManagerControllerClient } from '../generated/jobmanager/JobManagerController';
import { Job } from '../generated/jobmanager/Job';
import getTestClient from './helpers/grpc-client';
import prisma from '../prisma/client';
import { CreateNewJobResponse__Output } from '../generated/jobmanager/CreateNewJobResponse';
import { GetJobsResponse__Output } from '../generated/jobmanager/GetJobsResponse';
import { notSuperset } from './helpers/set-comparisons';
import { fromTimestamp } from '../utils/timestamp';

// global test data
const userId = uuid();
const imageCount = 100;

///////////////////////////////////////////////////
// Helper functions
///////////////////////////////////////////////////

async function eraseAllData() {
    await prisma.job.deleteMany();
    await prisma.image.deleteMany();
}

async function createJobs(
    userId: string,
    qty: number,
    scanned: boolean = false,
    inProgress: boolean = false,
) {
    const jobs = [...new Array(qty)].map((_, index) => ({
        name: `job number ${index + 1}`,
        description: `description of job ${index + 1}`,
        source: `/source_${index}`,
        userId,
        scanned,
        inProgress,
    }));
    await prisma.job.createMany({ data: jobs });
}

function assertJobData(
    data: unknown,
    scanned: boolean = false,
    inProgress: boolean = false,
) {
    assert(typeof data === 'object');
    const job = data as Job;
    assert(job.id);
    assert(job.name);
    assert(job.description);
    assert(job.source);
    assert.equal(job.userId, userId);
    assert.equal(job.images, 0);
    assert.equal(job.jpegs, 0);
    assert.equal(job.pngs, 0);
    assert.equal(job.scanned, scanned);
    assert.equal(job.inProgress, inProgress);
    assert(job.createdAt);
    const today = new Date().toISOString().split('T').shift();
    // handle values from DB or gRPC Query -- Date or Timestamp
    const createdAt =
        job.createdAt instanceof Date
            ? job.createdAt
            : fromTimestamp(job.createdAt);
    const ca = createdAt.toISOString().split('T').shift();
    assert.equal(ca, today);
}

///////////////////////////////////////////////////
// Test setup
///////////////////////////////////////////////////

describe('gRPC Integration Test', function () {
    this.timeout(5000);
    let client: JobManagerControllerClient;

    before(async () => {
        console.log('setting up connections');
        client = await getTestClient();
        await createJobs(userId, imageCount);
    });

    after(async () => {
        console.log('tearing down connections');
        client.close();
        await eraseAllData();
        await prisma.$disconnect();
    });

    // Test data

    const name = 'test job';
    const description = 'test job description';
    const source = '/test';

    const correlationId = uuid();
    const meta = new Metadata();
    meta.set('x-correlation-id', correlationId);

    ///////////////////////////////////////////////////
    // Helper function for running getAllJobs using client
    ///////////////////////////////////////////////////

    function getJobsFromGrpc(
        items: number = imageCount,
        cursor: string = '',
        method: 'getAllJobs' | 'getAllJobsInProgress' = 'getAllJobs',
    ): Promise<GetJobsResponse__Output | undefined> {
        return new Promise((resolve, reject) => {
            client[method]({ items, cursor }, meta, (err, response) => {
                if (err) reject(err);
                else resolve(response);
            });
        });
    }

    ///////////////////////////////////////////////////
    // Tests..
    ///////////////////////////////////////////////////

    it('should create a new job', async () => {
        const response = await new Promise<
            CreateNewJobResponse__Output | undefined
        >((resolve, reject) => {
            client.createNewJob(
                { name, description, source, userId },
                meta,
                (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                },
            );
        });
        assert(response);
        assert.equal(response.errors, undefined);
        assert(response.id);

        const newJob = await prisma.job.findUnique({
            where: { id: response.id },
        });
        assert(newJob);
        assertJobData(newJob);

        assert.equal(newJob.name, name);
        assert.equal(newJob.description, description);
        assert.equal(newJob.source, source);

        await prisma.job.delete({ where: { id: newJob.id } });
    });

    it('should get all jobs', async () => {
        const response = await getJobsFromGrpc();

        assert(response);
        assert.equal(response.errors, undefined);
        assert(response.jobs?.values);

        const jobs = response.jobs.values;
        assert.equal(jobs.length, imageCount);

        jobs.forEach((j) => assertJobData(j));
    });

    it('should page jobs', async () => {
        const response1 = await getJobsFromGrpc(50);

        assert(response1);
        assert.equal(response1.errors, undefined);
        assert.equal(response1.jobs?.values?.length, 50);

        const lastJob = response1.jobs?.values?.slice(-1).pop();
        assert(lastJob);
        const cursor = lastJob.id;
        assert(cursor);

        const response2 = await getJobsFromGrpc(50, cursor);
        assert(response2);
        assert.equal(response2.errors, undefined);
        assert.equal(response2.jobs?.values?.length, 50);
        const firstBatchIds = new Set(response1.jobs?.values?.map((j) => j.id));
        const secondBatchIds = new Set(
            response2.jobs?.values?.map((j) => j.id),
        );
        assert(notSuperset(firstBatchIds, secondBatchIds));
    });

    it('should get jobs in progress', async () => {
        let response = await getJobsFromGrpc(
            imageCount,
            '',
            'getAllJobsInProgress',
        );

        assert(response);
        assert.equal(response.errors, undefined);
        let jobsInProgressCount = response.jobs?.values?.length ?? 0;
        console.log('>>', response.jobs?.values);
        assert.equal(jobsInProgressCount, 0);

        // add some jobs in progress, with 10 marked as scanned as well as in progress
        await createJobs(userId, 50, false, true);
        await createJobs(userId, 10, true, true);

        response = await getJobsFromGrpc(
            imageCount,
            '',
            'getAllJobsInProgress',
        );
        assert(response);
        assert.equal(response.errors, undefined);
        jobsInProgressCount = response.jobs?.values?.length ?? 0;
        assert.equal(jobsInProgressCount, 50);

        response.jobs?.values?.forEach((job) => assert(job.inProgress));

        // check paging
        const response2 = await getJobsFromGrpc(
            jobsInProgressCount / 2,
            '',
            'getAllJobsInProgress',
        );
        assert(response2);
        assert.equal(response2.errors, undefined);
        assert.equal(
            response2.jobs?.values?.length ?? 0,
            jobsInProgressCount / 2,
        );
        response2.jobs?.values?.forEach((job) => assert(job.inProgress));
        const finalId = response2.jobs?.values?.slice(-1).pop()?.id;
        assert(finalId);

        const response3 = await getJobsFromGrpc(
            jobsInProgressCount / 2,
            finalId,
            'getAllJobsInProgress',
        );
        assert(response3);
        assert.equal(response2.errors, undefined);
        assert.equal(
            response3.jobs?.values?.length ?? 0,
            jobsInProgressCount / 2,
        );
        response3.jobs?.values?.forEach((job) => assert(job.inProgress));
    });

    it('should delete jobs and all data', async () => {
        await eraseAllData();
        
    });
});
