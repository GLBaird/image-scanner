'use client';

import { ImageData } from '@/app/actions/images';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableRow } from './ui/table';
import FaceDisplay from './FaceDisplay';
import { useContext } from 'react';
import { ImagesContext } from '@/app/contexts/images';

export default function ImageFaces({ image }: { image: ImageData }) {
    const { drawFaces, changeDrawState } = useContext(ImagesContext);

    return (
        <div className="p-5">
            <h4 className="font-bold flex justify-between items-center">
                Image Faces
                <Switch checked={drawFaces} onCheckedChange={changeDrawState} />
            </h4>
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
                    </TableBody>
                </Table>
                <hr className="border-black my-3" />

                <div className="flex flex-wrap justify-center mt-5 gap-5">
                    {image.faces.map((face) => (
                        <FaceDisplay key={face.hash} source={image.source} face={face} />
                    ))}
                </div>
            </div>
        </div>
    );
}
