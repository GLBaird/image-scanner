'use client';

import { useSearchParams } from 'next/navigation';
import CreateNewJobForm, { NEW_JOB_ID } from '@/components/CreateNewJobForm';
import JobDetail from '@/components/JobDetail';

export function JobsDetailChooser() {
    const searchParams = useSearchParams();
    const isAddNewJob = searchParams.get('selected') === NEW_JOB_ID;

    return isAddNewJob ? <CreateNewJobForm /> : <JobDetail />;
}
