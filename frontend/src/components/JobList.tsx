'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Images, Loader, Play, Plus } from 'lucide-react';
import LocalDate from '@/components/ui/locale-date';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import Link from 'next/link';
import Routes from '@/lib/routes';
import { Job, startJobScan } from '@/app/actions/manage-jobs';
import { useState } from 'react';
import MessageDialog from './MessageDialog';
import { setUrlParams } from '@/lib/url';
import { NEW_JOB_ID } from '@/components/CreateNewJobForm';

export type JobListProps = {
    jobs: Job[];
    hideTools?: boolean;
};
export default function JobList({ jobs, hideTools = false }: JobListProps) {
    const [jobPendingScan, setJobPendingScan] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const selected = searchParams.get('selected');

    const handleSelectJob = (id: string) => {
        if (selected === id) {
            router.replace(pathname);
            return;
        }
        setUrlParams({ pathname, searchParams, key: 'selected', value: id }, router);
    };

    const handleScanJob = async (id: string) => {
        setJobPendingScan(id);
        const { errors } = await startJobScan(id);
        if (errors) {
            setErrors(errors);
            setJobPendingScan('');
            return;
        }
        router.push(`${Routes.DASHBOARD_PROGRESS}?selected=${id}`);
    };

    const handleAddJob = () => {
        setUrlParams({ pathname, searchParams, key: 'selected', value: NEW_JOB_ID }, router);
    };

    return (
        <>
            <MessageDialog open={errors.length > 0} title="Error" onConfirm={() => setErrors([])}>
                There has been an error trying to start the job scan:
                <br />
                <span className="text-red-500 inline-block ml-5 mt-2">{errors.join(', ')}</span>
            </MessageDialog>
            <Card className="dashboard-first-column">
                <CardHeader className="bg-blue-50 py-2 shadow">
                    <div className="flex justify-between items-center">
                        <h2 className="m-0">Current Jobs:</h2>
                        {!hideTools && (
                            <Button className="size-8 bg-white" variant="outline" onClick={handleAddJob}>
                                <Plus />
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0 mt-1 scroll-container">
                    <ul>
                        {jobs.map((job) => (
                            <li
                                key={job.id}
                                className={cn(
                                    'even:bg-gray-100 py-6 px-5 shadow hover:bg-blue-50 hoever:even:bg-50',
                                    job.id === selected && 'bg-amber-50 even:bg-amber-50 hover:bg-amber-50',
                                )}
                                role="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSelectJob(job.id);
                                }}
                            >
                                <div className="flex justify-between items-center gap-5">
                                    <h3 className="m-0 text-[1.2rem] text-cyan-600 text-ellipsis whitespace-nowrap overflow-hidden">
                                        {job.name}
                                    </h3>
                                    <div className="w-fit text-nowrap">
                                        <LocalDate date={job.createdAt} />
                                    </div>
                                </div>

                                <div className="ml-3 my-2">{job.description}</div>
                                {!hideTools && (
                                    <div className="flex justify-end items-center gap-2 h-5">
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <div
                                                    className={cn(
                                                        job.inProgress
                                                            ? 'bg-amber-500'
                                                            : job.scanned
                                                            ? 'bg-green-500'
                                                            : 'bg-gray-400',
                                                        'size-5',
                                                    )}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent>Data ready for use</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <div
                                                    className={cn(
                                                        job.inProgress ? 'bg-green-500' : 'bg-gray-400',
                                                        'size-5',
                                                    )}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent>Scanning in progress...</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Button
                                                    variant="ghost"
                                                    className={cn(
                                                        (!job.scanned || job.inProgress) && 'opacity-30',
                                                        'p-0 size-5 mt-1 rounded-none hover:bg-transparent',
                                                    )}
                                                    disabled={!job.scanned || job.inProgress}
                                                    asChild
                                                >
                                                    <Link href={`${Routes.GALLERY}?selected=${job.id}`}>
                                                        <Images
                                                            className={
                                                                job.scanned || job.inProgress
                                                                    ? 'text-green-600 hover:text-green-500 size-5'
                                                                    : 'text-black size-5'
                                                            }
                                                        />
                                                    </Link>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View gallery</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Button
                                                    variant="ghost"
                                                    className={cn(
                                                        (job.scanned || job.inProgress) && 'opacity-30',
                                                        'p-0 size-5 -mt-1.5 -ml-1 rounded-none hover:bg-transparent',
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (job.scanned || job.inProgress || jobPendingScan) return;
                                                        handleScanJob(job.id);
                                                    }}
                                                    disabled={job.scanned || job.inProgress}
                                                    asChild
                                                >
                                                    {jobPendingScan == job.id ? (
                                                        <Loader className="text-green-600 animate-spin" />
                                                    ) : (
                                                        <Play
                                                            className={
                                                                job.scanned || job.inProgress
                                                                    ? 'text-black'
                                                                    : 'text-green-600 fill-green-600 hover:text-green-500 hover:fill-green-500'
                                                            }
                                                            fill="black"
                                                        />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Start file scanning</TooltipContent>
                                        </Tooltip>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </>
    );
}
