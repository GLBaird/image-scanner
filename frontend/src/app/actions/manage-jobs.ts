'use server';

import { revalidateTag } from 'next/cache';
import { cache } from 'react';
import CacheTags from '@/lib/cache-tags';

export type Job = {
    id: string;
    name: string;
    description: string;
    source: string;
    images: number;
    jpeg: number;
    png: number;
    createdAt: Date;
    scanned: boolean;
    inProgress: boolean;
};

// TODO: Remove placeholder content and connect to job service
let jobs: Job[] = [...new Array(30)].map((_, index) => ({
    id: `id_${index}`,
    name: `Sample Job ${index + 1}`,
    description: `Some reason for the existence of sample job ${
        index + 1
    }. Will explain all the stuff important and useful...`,
    source: `/module-${index + 1}`,
    images: Math.floor(Math.random() * 1000),
    jpeg: Math.floor(Math.random() * 800),
    png: Math.floor(Math.random() * 800),
    createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
    scanned: Math.random() > 0.5,
    inProgress: Math.random() > 0.8,
}));

export const getJobs = cache(async (): Promise<{ jobs: Job[]; errors?: string[] }> => {
    // TODO: connect to API
    return { jobs };
});

export const getJobsInProgress = cache(async (): Promise<{ jobs: Job[]; errors?: string[] }> => {
    // TODO: connect to API
    const progressJobs = jobs.filter((j) => j.inProgress && !j.scanned);
    return { jobs: progressJobs };
});

export async function getJob(id: string): Promise<{ job?: Job; errors?: string[] }> {
    // TODO: connect to API
    const job = jobs.find((j) => j.id === id);
    return { job, errors: job !== undefined ? ['job not found'] : undefined };
}

export async function deleteJob(id: string): Promise<{ errors?: string[] }> {
    // TODO: connect to API
    const startLength = jobs.length;
    jobs = jobs.filter((j) => j.id !== id);
    revalidateTag(CacheTags.jobs);
    return { errors: jobs.length === startLength ? ['job not found'] : undefined };
}

export async function updateJob(
    id: string,
    update: { name?: string; description?: string },
): Promise<{ errors?: string[] }> {
    // TODO: connect to API
    if (!id || !update || (!update.name && !update.description)) return { errors: ['missing update data'] };
    const job = jobs.find((j) => j.id === id);
    if (!job) return { errors: ['job not found'] };
    const index = jobs.indexOf(job);
    jobs[index] = {
        ...job,
        ...(update.name !== undefined && { name: update.name }),
        ...(update.description !== undefined && { description: update.description }),
    };
    revalidateTag(CacheTags.jobs);
    return {};
}

export async function startJobScan(id: string): Promise<{ state?: 'in-progress' | 'completed'; errors?: string[] }> {
    // TODO: connect to API
    const job = jobs.find((j) => j.id === id);
    if (!job) return { errors: ['job not found'] };
    const index = jobs.indexOf(job);
    jobs[index] = {
        ...job,
        scanned: false,
        inProgress: true,
    };
    revalidateTag(CacheTags.jobs);
    revalidateTag(CacheTags.progress);
    return { state: 'in-progress' };
}
