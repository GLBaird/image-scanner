'use client';

import { createContext } from 'react';
import { Job } from '../actions/manage-jobs';

export type JobsDashboardContextData = { jobs: Job[]; sources: string[] };

export const JobsDashboardContext = createContext<JobsDashboardContextData>({ jobs: [], sources: [] });

export default function JobsDashboardContextProvider({
    jobs,
    sources,
    children,
}: JobsDashboardContextData & { children: React.ReactNode }) {
    return <JobsDashboardContext value={{ jobs, sources }}>{children}</JobsDashboardContext>;
}
