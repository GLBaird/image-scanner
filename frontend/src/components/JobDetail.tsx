'use client';

import { Images, Monitor, Play, Trash2 as Trash, X as Close, Loader } from 'lucide-react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import LocalDate from '@/components/ui/locale-date';
import Routes from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useContext, useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { DialogDescription } from '@/components/ui/dialog';
import ErrorsList from '@/components/ErrorsList';
import { deleteJob, Job, startJobScan } from '@/app/actions/manage-jobs';
import { JobsDashboardContext } from '@/app/contexts/JobsDashboard';

function getCurrentState(job: Job): string {
    if (job.scanned) return 'Scanned and data ready for use.';
    if (job.inProgress) return 'Job in progress, scanning files...';
    return 'Job waiting to run and scan for data.';
}

type JobDetailState = {
    confirmDelete: boolean;
    pendingDelete: boolean;
    pendingScan: boolean;
    deleteErrors: string[];
    scanErrors: string[];
};

const initialState: JobDetailState = {
    confirmDelete: false,
    pendingDelete: false,
    pendingScan: false,
    deleteErrors: [],
    scanErrors: [],
};

export default function JobDetail() {
    const [state, setState] = useState<JobDetailState>(initialState);
    const { jobs } = useContext(JobsDashboardContext);
    const { confirmDelete, pendingDelete, pendingScan, deleteErrors, scanErrors } = state;

    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const selected = searchParams.get('selected');
    const selectedJob = selected ? jobs.filter((j) => j.id === selected).pop() : null;

    const handleStartScan = async () => {
        if (pendingScan || !selected) return;
        setState((prev) => ({ ...prev, scanErrors: [], pendingScan: true }));
        const { errors } = await startJobScan(selected);
        if (errors && errors.length > 0) {
            setState((prev) => ({ ...prev, pendingScan: false, scanErrors: errors }));
            return;
        }
        router.push(`${Routes.DASHBOARD_PROGRESS}?selected=${selected}`, { scroll: false });
    };

    const handleDeleteJob = async () => {
        if (!selected) return;
        setState((prev) => ({ ...prev, deleteErrors: [], pendingDelete: true }));
        const { errors } = await deleteJob(selected);
        if (errors && errors.length > 0) {
            setState((prev) => ({ ...prev, pendingDelete: false, deleteErrors: errors }));
            return;
        }
        router.replace(Routes.DASHBOARD_JOBS);
        // defer closing UI to prevent animation glitch with UI update from reloading cached data afer delete
        setTimeout(() => setState((prev) => ({ ...prev, pendingDelete: false, confirmDelete: false })), 300);
    };

    return (
        <>
            <ConfirmDialog
                open={confirmDelete}
                title="Delete job"
                onConfirm={handleDeleteJob}
                onCancel={() => setState((prev) => ({ ...prev, confirmDelete: false }))}
                pending={pendingDelete}
                destructive
            >
                <DialogDescription>
                    Are you sure you want to delete this job and all related data? This cannot be undone!
                </DialogDescription>
                <ErrorsList errors={deleteErrors} showMessage />
            </ConfirmDialog>
            <Card className={cn(selectedJob ? 'block' : 'hidden', 'dashboard-detail-column')}>
                <CardHeader className="bg-blue-50 py-2 shadow">
                    <h2 className="m-0">Job Detail:</h2>
                </CardHeader>
                <CardContent className="dashboard-detail-column-scroll scroll-container">
                    {selectedJob && (
                        <div>
                            <div className="flex justify-between items-start">
                                <Button variant="link" className="p-0 -ml-4" asChild>
                                    <Link href={pathname}>
                                        <Close />
                                    </Link>
                                </Button>

                                <h3 className="m-0 ml-5 mb-5 text-right">{selectedJob.name}</h3>
                            </div>
                            <div className="flex justify-between">
                                <p>
                                    <strong>Created on:</strong>
                                    <br />
                                    <LocalDate date={selectedJob.createdAt} withTime />
                                </p>
                                <p className="text-right">
                                    <strong>File source:</strong>
                                    <br />
                                    {selectedJob.source}
                                </p>
                            </div>
                            <hr />
                            <p className="my-5">
                                <strong>Description:</strong>
                                <br />
                                {selectedJob.description}
                            </p>
                            <p className="my-5">
                                <strong>Current state:</strong>
                                <br />
                                {getCurrentState(selectedJob)}
                            </p>
                            {selectedJob.scanned && (
                                <div className="my-5">
                                    <strong>Useful stats:</strong>
                                    <ul className="ml-5 mt-2">
                                        <li>
                                            <strong className="inline-block w-20">Images:</strong>
                                            {selectedJob.images}
                                        </li>
                                        <li>
                                            <strong className="inline-block w-20">JPEGs:</strong>
                                            {selectedJob.jpeg}
                                        </li>
                                        <li>
                                            <strong className="inline-block w-20">PNGs:</strong>
                                            {selectedJob.png}
                                        </li>
                                    </ul>
                                </div>
                            )}
                            <hr />
                            <h4 className="font-bold mt-5">Tasks:</h4>
                            <div className="flex flex-wrap justify-center gap-5 mt-5">
                                {selectedJob.scanned && !selectedJob.inProgress && (
                                    <Button asChild>
                                        <Link href={`${Routes.GALLERY}?selected=${selectedJob.id}`}>
                                            <Images />
                                            View Gallery
                                        </Link>
                                    </Button>
                                )}
                                {!selectedJob.scanned && !selectedJob.inProgress && (
                                    <Button onClick={handleStartScan}>
                                        {pendingScan ? <Loader className="animate-spin" /> : <Play />}
                                        Start scanning
                                    </Button>
                                )}
                                {!selectedJob.scanned && selectedJob.inProgress && (
                                    <Button asChild>
                                        <Link href={`${Routes.DASHBOARD_PROGRESS}?selected=${selectedJob.id}`}>
                                            <Monitor />
                                            Monitor Progress
                                        </Link>
                                    </Button>
                                )}

                                <Button
                                    variant="destructive"
                                    className="disabled:opacity-40"
                                    onClick={() => setState((prev) => ({ ...prev, confirmDelete: true }))}
                                    disabled={selectedJob.inProgress}
                                >
                                    <Trash />
                                    Delete Job and data
                                </Button>
                            </div>
                            {scanErrors.length > 0 && (
                                <div className="mt-5">
                                    <hr />
                                    <h3 className="text-red-700">Errors</h3>
                                    There has been errors when scanning the job:
                                    <ErrorsList className="ml-5" errors={scanErrors} />
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
