import * as assert from 'assert';
import * as path from 'path';
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
import { DeleteJobResponse } from '../generated/jobmanager/DeleteJobResponse';
import { GetAvailableSourcesResponse } from '../generated/jobmanager/GetAvailableSourcesResponse';
import { SourceFiles, SourceFolders } from './helpers/source-data';
import { StartScanningJobResponse } from '../generated/jobmanager/StartScanningJobResponse';
import pause from './helpers/pause';

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

function assertJobData(data: unknown, scanned: boolean = false, inProgress: boolean = false) {
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
    const createdAt = job.createdAt instanceof Date ? job.createdAt : fromTimestamp(job.createdAt);
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
        // check clean DB
        const jCount = await prisma.job.count();
        const iCount = await prisma.image.count();
        if (jCount > 0 || iCount > 0)
            throw new Error('Should be a clean DB for tests!! Will erase all data...');
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
        const response = await new Promise<CreateNewJobResponse__Output | undefined>(
            (resolve, reject) => {
                client.createNewJob(
                    { name, description, source, userId },
                    meta,
                    (err, response) => {
                        if (err) reject(err);
                        else resolve(response);
                    },
                );
            },
        );
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
        const secondBatchIds = new Set(response2.jobs?.values?.map((j) => j.id));
        assert(notSuperset(firstBatchIds, secondBatchIds));
    });

    it('should get jobs in progress', async () => {
        let response = await getJobsFromGrpc(imageCount, '', 'getAllJobsInProgress');

        assert(response);
        assert.equal(response.errors, undefined);
        let jobsInProgressCount = response.jobs?.values?.length ?? 0;
        assert.equal(jobsInProgressCount, 0);

        // add some jobs in progress, with 10 marked as scanned as well as in progress
        await createJobs(userId, 50, false, true);
        await createJobs(userId, 10, true, true);

        response = await getJobsFromGrpc(imageCount, '', 'getAllJobsInProgress');
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
        assert.equal(response2.jobs?.values?.length ?? 0, jobsInProgressCount / 2);
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
        assert.equal(response3.jobs?.values?.length ?? 0, jobsInProgressCount / 2);
        response3.jobs?.values?.forEach((job) => assert(job.inProgress));
    });

    it('should delete jobs and all data', async () => {
        await eraseAllData();

        const { id: jobId } = await prisma.job.create({
            data: {
                name: 'test',
                description: 'test',
                source: '/test',
                userId: 'user-01',
                inProgress: false,
                scanned: true,
                images: 1,
                jpegs: 1,
                pngs: 0,
            },
        });
        const baseImage = {
            filename: 'simple-image.jpg',
            source: '/source/simple-image.jpg',
            filesize: 100,
            width: 100,
            height: 100,
            mimetype: 'image/jpeg',
            format: 'format',
            colorspace: 'rgb',
            resolution: '72dpi',
            depth: 8,
        };

        const md5 = 'image1-md5';
        const sha1 = 'image1-sha1';

        const image1 = await prisma.image.create({
            data: {
                ...baseImage,
                jobIds: [jobId],
                md5,
                sha1,
            },
        });

        const image2 = await prisma.image.create({
            data: {
                ...baseImage,
                jobIds: ['different', jobId],
                md5: 'image2-md5',
                sha1: 'image2-sha1',
            },
        });

        const image3 = await prisma.image.create({
            data: {
                ...baseImage,
                jobIds: ['different'],
                md5: 'image3-md5',
                sha1: 'image3-sha1',
            },
        });

        const exifData = await prisma.exifData.create({
            data: {
                md5,
                exif: "{ value: 'data' }",
            },
        });

        const faceData = await prisma.face.create({
            data: {
                md5,
                hash: 'face-hash',
                coordX: 100,
                coordY: 100,
                width: 100,
                height: 100,
            },
        });

        const classificationData = await prisma.classification.create({
            data: {
                md5,
                tags: ['human', 'window', 'chair', 'fire'],
            },
        });

        // should delete only image1, but delete all cascading data to objects grouped via md5

        const response = await new Promise<DeleteJobResponse | undefined>((resolve, reject) => {
            client.deleteJobAndAllData({ id: jobId }, meta, (err, resp) => {
                if (err) reject(err);
                else resolve(resp);
            });
        });

        assert(response);
        assert.equal(response.errors, undefined);
        assert(response.success);

        // check correct data is deleted
        const checkJob = await prisma.job.count({ where: { id: jobId } });
        assert.equal(checkJob, 0);
        const checkImage = await prisma.image.count({
            where: { id: image1.id },
        });
        assert.equal(checkImage, 0);
        const checkExif = await prisma.exifData.count({ where: { md5 } });
        assert.equal(checkExif, 0);
        const checkFace = await prisma.face.count({
            where: { id: faceData.id },
        });
        assert.equal(checkFace, 0);
        const checkClassification = await prisma.classification.count({
            where: { md5 },
        });
        assert.equal(checkClassification, 0);

        // check other image data remains
        const checkImage2 = await prisma.image.count({
            where: { id: image2.id },
        });
        assert.equal(checkImage2, 1);
        const checkImage3 = await prisma.image.count({
            where: { id: image3.id },
        });
        assert.equal(checkImage3, 1);
    });

    it('should get available sources from within source folder', async () => {
        const response = await new Promise<GetAvailableSourcesResponse | undefined>(
            (resolve, reject) => {
                client.getAvailableSources({}, meta, (err, resp) => {
                    if (err) reject(err);
                    else resolve(resp);
                });
            },
        );
        assert(response);
        assert.equal(response.errors, undefined);
        assert(response.sources?.values);
        response.sources.values.forEach((v) => {
            assert(v.name);
            assert(v.createdAt);
            assert(v.modifiedAt);
        });
        assert.deepStrictEqual(
            response.sources.values.map((v) => v.name),
            SourceFolders,
        );
    });

    it('it should scan selected source volume and produce correct data on the database.', async () => {
        const promises = ['source1'].map(async (source) => {
            const { id: jobId } = await prisma.job.create({
                data: {
                    name: `source ${source}`,
                    description: `testing scanning source: ${source}`,
                    source,
                    userId,
                },
            });
            const startScanningJob = () =>
                new Promise<StartScanningJobResponse | undefined>((resolve, reject) =>
                    client.startScanningJob({ id: jobId }, meta, (err, resp) => {
                        if (err) reject(err);
                        else resolve(resp);
                    }),
                );
            type expectedState = 'started' | 'in-progress' | 'completed';
            const response = await startScanningJob();
            assert(response);
            assert.equal(response.errors, undefined);
            assert((response.state as expectedState) === 'started');

            // wait for job to complete as images are batched in 1 second bursts
            await pause(1500);

            // check generated data is what's expected
            const images = await prisma.image.findMany({ where: { jobIds: { has: jobId } } });
            const expectedImages = SourceFiles[source] as string[];
            assert.equal(images.length, expectedImages.length);
            const md5s = new Set();
            images.forEach((image) => {
                assert(expectedImages.find((filename) => filename === image.filename));
                // check has unique md5
                assert(image.md5 && !md5s.has(image.md5));
                md5s.add(image.md5);
                assert(image.filesize > 0);
                assert(image.width > 0);
                assert(image.height > 0);
                assert(image.colorspace);
                assert(image.resolution);
                assert(image.depth);
                assert(image.format);
                assert.equal(
                    image.mimetype,
                    image.filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
                );
                assert.equal(image.jobIds.length, 1);
                assert.equal(image.jobIds[0], jobId);
                assert(image.createdAt);
                assert.equal(image.source, '/' + path.join(source, image.filename));

                // TODO: check EXIF data

                // TODO: check Face data

                // TODO: check classification
            });
        });

        await Promise.all(promises);
    });
});
