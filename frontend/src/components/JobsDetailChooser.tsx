'use client';

import { useSearchParams } from 'next/navigation';
import CreateNewJobForm, { NEW_JOB_ID } from '@/components/CreateNewJobForm';
import JobDetail from '@/components/JobDetail';
import { Job } from '@/app/actions/manage-jobs';

export type JobsDetailChooserProps = {
    jobs: Job[];
    sources: string[];
};
export function JobsDetailChooser({ jobs, sources }: JobsDetailChooserProps) {
    const searchParams = useSearchParams();
    const isAddNewJob = searchParams.get('selected') === NEW_JOB_ID;

    return isAddNewJob ? <CreateNewJobForm sources={sources} /> : <JobDetail jobs={jobs} />;
}
