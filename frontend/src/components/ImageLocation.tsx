'use client';

import { ImageData } from '@/app/actions/images';
import { Table, TableBody, TableCell, TableRow } from './ui/table';
import { getLatLonFromExif } from '@/lib/exif-gps';
import dynamic from 'next/dynamic';
import { Loader } from 'lucide-react';

// 👇 Dynamically import LeafletMap with SSR disabled
const LeafletMap = dynamic(() => import('@/components/LeafletMap').then((mod) => mod.default), {
    ssr: false,
    loading: () => (
        <p>
            <Loader className="animate-spin" /> Loading map...
        </p>
    ),
});

export default function ImageLocation({ image }: { image: ImageData }) {
    const { lat, lon } = getLatLonFromExif(image.exifData ?? {}) ?? {};

    const showMap = lat !== undefined && lon !== undefined;

    return (
        <div className="p-5">
            <h4 className="font-bold">Image Location</h4>
            <hr className="border-black my-3" />
            <div>
                <Table cellSpacing={0} cellPadding={0}>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-semibold">File:</TableCell>
                            <TableCell className="whitespace-nowrap text-ellipsis overflow-hidden mr-1">
                                {image.filename}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
            <hr className="border-black my-3" />
            {!showMap && <div>The image has no GPS data.</div>}
            {showMap && <LeafletMap latitude={lat} longitude={lon} />}
        </div>
    );
}
