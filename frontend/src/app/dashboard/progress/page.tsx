import JobList from '@/components/JobList';
import ProgressDetail from '@/components/ProgressDetail';
import { getJobsInProgress } from '@/app/actions/manage-jobs';
import CacheTags from '@/lib/cache-tags';
import ErrorsList from '@/components/ErrorsList';

export const revalidate = 300;
export const fetchCacheTags = [CacheTags.progress];

export default async function DashboardProgress() {
    const { jobs, errors } = await getJobsInProgress();

    if (errors) {
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
            <div className="w-full md:w-[43%]">
                <JobList jobs={jobs} hideTools />
            </div>
            <ProgressDetail jobs={jobs} />
        </main>
    );
}
