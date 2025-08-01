import JobList from '@/components/JobList';
import ProgressDetail from '@/components/ProgressDetail';
import { getJobsInProgress } from '@/app/actions/manage-jobs';
import ErrorsList from '@/components/ErrorsList';
import JobsDashboardContextProvider from '@/app/contexts/JobsDashboard';

export default async function DashboardProgress() {
    const { jobs, errors } = await getJobsInProgress();

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
            <JobsDashboardContextProvider jobs={jobs} sources={[]}>
                <div className="w-full md:w-[43%]">
                    <JobList hideTools />
                </div>
                <ProgressDetail />
            </JobsDashboardContextProvider>
        </main>
    );
}
