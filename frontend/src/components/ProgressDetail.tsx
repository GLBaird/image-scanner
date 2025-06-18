'use client';

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React, { useContext } from 'react';
import { Loader2 as Loader, X as Close } from 'lucide-react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { JobsDashboardContext } from '@/app/contexts/JobsDashboard';
import { EnvVariables, getEnv } from '@/envs';
import { useSSE } from '@/app/hooks/useSSE';
import { Button } from './ui/button';
import Link from 'next/link';

type StageInfo = {
    name: string;
    info: string;
    progress: number;
    total: number;
};

type ProgressState = {
    started: boolean;
    filesScanned: boolean;
    stages: StageInfo[];
    errors: string[];
    info?: string;
    files: number;
    images: number;
    jpegs: number;
    pngs: number;
};

const initialState: ProgressState = {
    started: false,
    filesScanned: false,
    stages: [],
    errors: [],
    info: '',
    files: 0,
    images: 0,
    jpegs: 0,
    pngs: 0,
};

const WaitingForScanToStart = () => (
    <div className="flex flex-col gap-3 justify-center items-center h-60">
        <div className="text-[1.3rem]">
            Waiting for scan to initialise or progress update...
            <span className="animate-caret-blink">...</span>
        </div>
        <Loader className="animate-spin size-10" />
    </div>
);

const FileScanUpdate = ({ state }: { state: ProgressState }) => {
    if (state.files === 0) {
        return (
            <div>
                <Loader className="animate-spin" /> Waiting for file scanning data...
            </div>
        );
    }
    const { info, files, images, jpegs, pngs } = state;

    return (
        <div>
            <h3>Scanning source folder for files...</h3>
            <div className="ml-5">
                <p className="my-5">
                    <span className="font-bold w-30 inline-block">Current file:</span> ${info}
                </p>
                <p>Scanning outcomes:</p>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell>Files:</TableCell>
                            <TableCell>{files}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Images:</TableCell>
                            <TableCell>{images}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>JPEGs:</TableCell>
                            <TableCell>{jpegs}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>PNGs:</TableCell>
                            <TableCell>{pngs}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

const StageScanUpdate = ({ state }: { state: ProgressState }) => {
    const { stages } = state;

    return (
        <div>
            <h3>Extracting Image Data...</h3>
            <p>Currently running images through different data extraction stages:</p>
            <ul>
                {stages.map(({ name, info, progress, total }) => (
                    <li key={name} className="border-2 mt-4">
                        <h4 className="font-bold bg-gray-50 px-3 py-2 mt-0 mb-2">{name}</h4>
                        <p className="mx-5 my-2">Processing: {info}</p>
                        <div className="flex justify-stretch items-center mx-5 mb-5">
                            {0}
                            <div className="h-5 bg-gradient-to-tr from-cyan-300 to-blue-400 mx-2 grow flex justify-end shadow-blue-950 shadow-xs">
                                <div
                                    className="h-5 bg-white border-l-blue-600 border-l-2 inline-block"
                                    style={{ width: `${((total - progress) / total) * 100}%` }}
                                />
                            </div>
                            {total}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

function getUpdatesUI(state: ProgressState | null): React.ReactNode {
    if (state === null || !state.started || state.files === 0) {
        return <WaitingForScanToStart />;
    }
    if (!state.filesScanned && state.files > 0) {
        return <FileScanUpdate state={state} />;
    }

    return <StageScanUpdate state={state} />;
}

const sseUrl = getEnv(EnvVariables.sseUrl);

export default function ProgressDetail() {
    const { jobs } = useContext(JobsDashboardContext);

    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const selected = searchParams.get('selected');
    const selectedJob = selected ? jobs.filter((j) => j.id === selected).pop() : null;

    const sseEvent = selectedJob ? `${sseUrl}/${selectedJob.id}` : '';

    const state = useSSE<ProgressState | null>(sseEvent);
    const { errors } = state ?? { errors: [] };

    return (
        <>
            <Card className={cn(selectedJob ? 'block' : 'hidden', 'dashboard-detail-column')}>
                <CardHeader className="bg-blue-50 py-2 shadow">
                    <h2 className="m-0">Scan Progress:</h2>
                </CardHeader>
                <CardContent className="dashboard-detail-column-scroll overflow-y-auto overflow-x-hidden">
                    <div>
                        {selectedJob && (
                            <>
                                <div className="flex justify-between items-start">
                                    <Button variant="link" className="p-0 -ml-4" asChild>
                                        <Link href={pathname}>
                                            <Close />
                                        </Link>
                                    </Button>
                                </div>
                                {getUpdatesUI(state)}
                            </>
                        )}
                        {errors.length > 0 && (
                            <div>
                                <Accordion type="single" collapsible>
                                    <AccordionItem value="View Errors">
                                        <AccordionTrigger className="text-red-700">Errors</AccordionTrigger>
                                        <AccordionContent>
                                            <ul className="list-disc pl-5">
                                                {errors.map((error, index) => (
                                                    <li key={`${error}-${index}`}>{error}</li>
                                                ))}
                                            </ul>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
