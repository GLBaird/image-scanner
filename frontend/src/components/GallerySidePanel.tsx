'use client';

import { ImagesContext } from '@/app/contexts/images';
import { CircleChevronLeftIcon, Image as ImageIcon } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useContext } from 'react';
import ImageInfo from './ImageInfo';
import ImageExif from './ImageExif';
import ImageLocation from './ImageLocation';
import ImageFaces from './ImageFaces';
import GalleryOptions from './GalleryOptions';
import { Button } from './ui/button';
import { setUrlParams } from '@/lib/url';

export default function GallerySidePanel() {
    const { images } = useContext(ImagesContext);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const selected = searchParams.get('selected');
    const selectedImage = images.find((i) => i.id === selected);
    const router = useRouter();
    const mode = searchParams.get('mode') ?? 'info';

    if (!selectedImage) {
        return (
            <div
                className="hidden md:block bg-gradient-to-b from-gray-300 to-gray-100 shadow-2xl shrink-0 scroll-container pt-10
                        w-80 xl:w-100"
            >
                <div className="flex flex-col text-center justify-center items-center grow p-10 h-full">
                    <ImageIcon className="size-20 text-gray-500 stroke-1" />
                    Select an image from the gallery to view information...
                </div>
            </div>
        );
    }
    const getSidePanelContent = () => {
        if (mode === 'exif') return <ImageExif image={selectedImage} />;
        if (mode === 'location') return <ImageLocation image={selectedImage} />;
        if (mode === 'faces') return <ImageFaces image={selectedImage} />;
        return <ImageInfo image={selectedImage} />;
    };

    const handleCloseSidePanelOnMobile = () => {
        setUrlParams({ pathname, key: 'selected', value: '', searchParams }, router);
    };

    return (
        <div
            className="absolute md:static z-1000 h-full
                       bg-gradient-to-b from-gray-300 to-gray-100 shadow-2xl 
                       shrink-0 scroll-container pt-10
                       w-full md:w-80 xl:w-100"
        >
            <div className="flex justify-center flex-wrap mt-5 md:hidden px-10">
                <GalleryOptions />
                <Button variant="ghost" onClick={handleCloseSidePanelOnMobile}>
                    <CircleChevronLeftIcon /> Back to Gallery
                </Button>
            </div>
            {getSidePanelContent()}
        </div>
    );
}
