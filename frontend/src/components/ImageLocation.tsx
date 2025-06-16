'use client';

import { ImageData } from '@/app/actions/images';
import LocalDate from './ui/locale-date';
import { Table, TableBody, TableCell, TableRow } from './ui/table';

export default function ImageLocation({ image }: { image: ImageData }) {
    return (
        <div className="p-5">
            <h4 className="font-bold">Image Location</h4>
            <hr className="border-black my-3" />
            <div className="mb-20">
                <Table cellSpacing={0} cellPadding={0}>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-semibold">Data:</TableCell>
                            <TableCell className="whitespace-nowrap text-ellipsis overflow-hidden mr-1">
                                {image.filename}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
