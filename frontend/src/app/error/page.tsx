'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

enum ErrorCode {
    Configuration = 'Configuration',
    AccessDenied = 'AccessDenied',
    Verification = 'Verification',
    Default = 'Default',
}

const errorMap = {
    [ErrorCode.Configuration]: (
        <p>
            There was a problem when trying to authenticate. Please contact us if this error persists. Unique error
            code: <code className="rounded-sm bg-slate-100 p-1 text-xs">Configuration</code>
        </p>
    ),
    [ErrorCode.AccessDenied]: (
        <p>
            Access has been denied. Check your authentication credentials. Contact us if you continue to have problems
            accessing your account. Unique error code:{' '}
            <code className="rounded-sm bg-slate-100 p-1 text-xs">AccessDenied</code>
        </p>
    ),
    [ErrorCode.Verification]: (
        <p>
            We have had trouble authenticating your access token from your provider. It may have expired, in use or
            invalid. Please try again later and contact us if you&apos;re not able to access your account. Unique error
            code: <code className="rounded-sm bg-slate-100 p-1 text-xs">Verification</code>
        </p>
    ),
    [ErrorCode.Default]: (
        <p>
            There has been an error acessing your account. Please try again later and contact us if you&apos;re unable
            to access you&apos;re account. Unique error code:{' '}
            <code className="rounded-sm bg-slate-100 p-1 text-xs">Default</code>
        </p>
    ),
};

function ErrorMessage() {
    const search = useSearchParams();
    const errorKey = (search.get('error') as ErrorCode) ?? ErrorCode.Default;

    return (
        <div className="font-normal text-gray-700 dark:text-gray-400">
            {errorMap[errorKey] || 'Please contact us if this error persists.'}
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center">
            <a
                href="#"
                className="block max-w-sm rounded-lg border border-gray-200 bg-white p-6 text-center shadow hover:bg-gray-100
                         dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
                <h5
                    className="mb-2 flex flex-row items-center justify-center gap-2 text-xl font-bold tracking-tight text-gray-900
                             dark:text-white"
                >
                    Something went wrong
                </h5>
                <Suspense fallback={<p>Loading...</p>}>
                    <ErrorMessage />
                </Suspense>
            </a>
        </div>
    );
}
