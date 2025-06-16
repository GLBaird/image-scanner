'use client';

import { ImageData } from '@/app/actions/images';
import LocalDate from './ui/locale-date';
import { Table, TableBody, TableCell, TableRow } from './ui/table';

export default function ImageInfo({ image }: { image: ImageData }) {
    return (
        <div className="p-5">
            <h4 className="font-bold">Image Info</h4>
            <hr className="border-black my-3" />
            <div className="mb-20">
                <Table cellSpacing={0} cellPadding={0}>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-semibold">Filename:</TableCell>
                            <TableCell className="whitespace-nowrap text-ellipsis overflow-hidden mr-1">
                                {image.filename}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Image source:</TableCell>
                            <TableCell className="whitespace-nowrap text-ellipsis overflow-hidden mr-1">
                                {image.source}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">MD5:</TableCell>
                            <TableCell className="whitespace-nowrap text-ellipsis overflow-hidden mr-1">
                                {image.md5}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">SHA1:</TableCell>
                            <TableCell className="whitespace-nowrap text-ellipsis overflow-hidden mr-1">
                                {image.sha1}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Filesize:</TableCell>
                            <TableCell>{Math.round(image.filesize * 1000) / 1000}mb</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Created at:</TableCell>
                            <TableCell>
                                <LocalDate date={image.createdAt} />
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Mimetype:</TableCell>
                            <TableCell>{image.mimetype}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Format:</TableCell>
                            <TableCell>{image.format}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Colorspace: </TableCell>
                            <TableCell>{image.colorspace}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Bit-depth: </TableCell>
                            <TableCell>{image.depth}-bit</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Resolution: </TableCell>
                            <TableCell>{image.resolution}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Size: </TableCell>
                            <TableCell>
                                {image.width}px x {image.height}px
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Tags: </TableCell>
                            <TableCell>{image.tags ? image.tags.join(', ') : 'No tags available...'}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
