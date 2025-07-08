'use client';

import { ImageData } from '@/app/actions/images';
import { Table, TableBody, TableCell, TableRow } from './ui/table';

function formatValue(value: unknown): React.ReactNode | string | number {
    if (typeof value === 'boolean') return value ? 'ON' : 'OFF';
    if (typeof value === 'object') {
        return Object.keys(value as object).map((k) => (
            <div key={k}>
                <div className="font-semibold">{k}:</div>
                <div className="pl-5">{formatValue((value as { [key: string]: unknown })[k])}</div>
            </div>
        ));
    }
    if (value === '[object Object]') return '------';
    if (typeof value === 'string' || typeof value === 'number') {
        return value;
    }
    return '------';
}

export default function ImageExif({ image }: { image: ImageData }) {
    console.log(image.exifData);
    return (
        <div className="p-5">
            <h4 className="font-bold">Image Exif-Data</h4>
            <hr className="border-black my-3" />
            <div className="mb-20">
                <Table cellSpacing={0} cellPadding={0}>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-semibold">Image:</TableCell>
                            <TableCell className="whitespace-nowrap text-ellipsis overflow-hidden mr-1">
                                {image.filename}
                            </TableCell>
                        </TableRow>
                        {Object.keys(image.exifData).map((key) => (
                            <TableRow key={key}>
                                <TableCell>{key}</TableCell>
                                <TableCell>{formatValue(image.exifData[key])}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
