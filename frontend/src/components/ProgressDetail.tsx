'use client';

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Job } from '@/app/actions/manage-jobs';
import React, { useState } from 'react';
import { Loader2 as Loader } from 'lucide-react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type ScanInfo = {
    info?: string;
    files: number;
    images: number;
    jpegs: number;
    pngs: number;
};

type StageInfo = {
    name: string;
    file: string;
    progress: number;
    total: number;
};

type ProgressState = {
    started: boolean;
    filesScanned: boolean;
    scanInfo?: ScanInfo;
    stages: StageInfo[];
    errors: string[];
};

const initialState: ProgressState = {
    started: false,
    filesScanned: false,
    stages: [],
    errors: [],
};

const WaitingForScanToStart = () => (
    <div className="flex flex-col gap-3 justify-center items-center h-60">
        <div className="text-[1.3rem]">
            Waiting for scan to initialise
            <span className="animate-caret-blink">...</span>
        </div>
        <Loader className="animate-spin size-10" />
    </div>
);

const FileScanUpdate = ({ state }: { state: ProgressState }) => {
    if (!state.scanInfo) {
        return (
            <div>
                <Loader className="animate-spin" /> Waiting for file scanning data...
            </div>
        );
    }
    const {
        scanInfo: { info, files, images, jpegs, pngs },
    } = state;

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
                {stages.map(({ name, file, progress, total }) => (
                    <li key={name} className="border-2 mt-4">
                        <h4 className="font-bold bg-gray-50 px-3 py-2 mt-0 mb-2">{name}</h4>
                        <p className="mx-5 my-2">Processing: {file}</p>
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

function getUpdatesUI(state: ProgressState): React.ReactNode {
    if (!state.started || (!state.filesScanned && !state.scanInfo)) {
        return <WaitingForScanToStart />;
    }
    if (!state.filesScanned && state.scanInfo) {
        return <FileScanUpdate state={state} />;
    }

    return <StageScanUpdate state={state} />;
}

export type ProgressDetailProps = {
    jobs: Job[];
};
export default function ProgressDetail({ jobs }: ProgressDetailProps) {
    const [state, setState] = useState<ProgressState>(initialState);
    const { errors } = state;

    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const selected = searchParams.get('selected');
    const selectedJob = selected ? jobs.filter((j) => j.id === selected).pop() : null;

    // TODO: get initial progress update and connect to SSE for updates...

    return (
        <>
            <Card className={cn(selectedJob ? 'block' : 'hidden', 'dashboard-detail-column')}>
                <CardHeader className="bg-blue-50 py-2 shadow">
                    <h2 className="m-0">Scan Progress:</h2>
                </CardHeader>
                <CardContent className="dashboard-detail-column-scroll overflow-y-auto overflow-x-hidden">
                    <div>
                        {selectedJob && getUpdatesUI(state)}
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
