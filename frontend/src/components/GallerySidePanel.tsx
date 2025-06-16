'use client';

import { ImagesContext } from '@/app/contexts/images';
import { Image } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useContext } from 'react';
import ImageInfo from './ImageInfo';
import ImageExif from './ImageExif';
import ImageLocation from './ImageLocation';
import ImageFaces from './ImageFaces';

export default function GallerySidePanel() {
    const { images } = useContext(ImagesContext);
    const searchParams = useSearchParams();
    const selected = searchParams.get('selected');
    const selectedImage = images.find((i) => i.id === selected);
    const mode = searchParams.get('mode') ?? 'info';

    if (!selectedImage) {
        return (
            <div className="flex flex-col text-center justify-center items-center grow p-10 h-full">
                <Image className="size-20 text-gray-500 stroke-1" />
                Select an image from the gallery to view information...
            </div>
        );
    }

    if (mode === 'exif') return <ImageExif image={selectedImage} />;
    if (mode === 'location') return <ImageLocation image={selectedImage} />;
    if (mode === 'faces') return <ImageFaces image={selectedImage} />;
    return <ImageInfo image={selectedImage} />;
}
