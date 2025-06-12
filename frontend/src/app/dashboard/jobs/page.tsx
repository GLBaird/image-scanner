import JobList from '@/components/JobList';
import JobDetail from '@/components/JobDetail';
import { getJobs } from '@/app/actions/manage-jobs';
import CacheTags from '@/lib/cache-tags';
import ErrorsList from '@/components/ErrorsList';
export const revalidate = 300;
export const fetchCacheTags = [CacheTags.jobs];

export default async function DashboardJobs() {
    const { jobs, errors } = await getJobs();

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
            <div className="w-full md:w-[43%]">
                <JobList jobs={jobs} />
            </div>
            <JobDetail jobs={jobs} />
        </main>
    );
}
