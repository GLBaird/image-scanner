import JobList from '@/components/JobList';
import { getJobs, getScanSources } from '@/app/actions/manage-jobs';
import ErrorsList from '@/components/ErrorsList';
import { JobsDetailChooser } from '@/components/JobsDetailChooser';
import JobsDashboardContextProvider from '@/app/contexts/JobsDashboard';

export default async function DashboardJobs() {
    const { jobs, errors: jobErrors } = await getJobs();
    const { sources, errors: sourceErrors } = await getScanSources();
    const errors = [...(jobErrors ?? []), ...(sourceErrors ?? [])];

    if (errors && errors.length > 0) {
        return (
            <main className="m-10">
                <h2>Error</h2>
                <p>An error has occured when loading data from the server. Please refresh the page to try again.</p>
                <ErrorsList errors={errors} />
            </main>
        );
    }

    return (
        <main className="dashboard-container">
            <JobsDashboardContextProvider jobs={jobs} sources={sources}>
                <div className="w-full md:w-[43%]">
                    <JobList />
                </div>
                <JobsDetailChooser />
            </JobsDashboardContextProvider>
        </main>
    );
}
