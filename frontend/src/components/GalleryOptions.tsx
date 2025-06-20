'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from './ui/button';
import { setUrlParams } from '@/lib/url';
import { Camera, Images, LayoutDashboard, Map, UserRound } from 'lucide-react';
import Routes from '@/lib/routes';
import Link from 'next/link';

export default function GalleryOptions() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const mode = searchParams.get('mode') ?? 'info';

    const handleModeChange = (mode: string) => {
        setUrlParams({ pathname, searchParams, key: 'mode', value: mode }, router);
    };

    return (
        <>
            <Button onClick={() => handleModeChange('info')} variant="ghost" asChild>
                <div
                    style={{ color: mode === 'info' ? undefined : 'black' }}
                    className="text-blue-700 cursor-pointer text-[0.9em]"
                >
                    <Images className="size-[1.6em] -mr-1" />
                    Image Information
                </div>
            </Button>
            <Button onClick={() => handleModeChange('exif')} variant="ghost" asChild>
                <div
                    style={{ color: mode === 'exif' ? undefined : 'black' }}
                    className="text-blue-700 cursor-pointer text-[0.9em]"
                >
                    <Camera className="size-[1.6em] -mr-1" />
                    Exif-Data
                </div>
            </Button>
            <Button onClick={() => handleModeChange('location')} variant="ghost" asChild>
                <div
                    style={{ color: mode === 'location' ? undefined : 'black' }}
                    className="text-blue-700 cursor-pointer text-[0.9em]"
                >
                    <Map className="size-[1.6em] -mr-1" />
                    Location
                </div>
            </Button>
            <Button onClick={() => handleModeChange('faces')} variant="ghost" asChild>
                <div
                    style={{ color: mode === 'faces' ? undefined : 'black' }}
                    className="text-blue-700 cursor-pointer text-[0.9em]"
                >
                    <UserRound className="size-[1.6em] -mr-1" />
                    Faces
                </div>
            </Button>
            <Button onClick={() => handleModeChange('faces')} variant="ghost" asChild>
                <Link href={Routes.DASHBOARD_JOBS} className="text-[0.9em]">
                    <div className="flex gap-1 items-center">
                        <LayoutDashboard className="size-[1.6em]" />
                        Dashboard
                    </div>
                </Link>
            </Button>
        </>
    );
}
