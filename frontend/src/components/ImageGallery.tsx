'use client';

import { Camera, Images, LayoutDashboard, Loader, Map, Minus, Plus, UserRound } from 'lucide-react';
import { Slider } from './ui/slider';
import { useMemo, useContext, useState, useEffect, useRef } from 'react';
import { END_OF_DATA_MARK, ImagesContext } from '@/app/contexts/images';
import { useElementSize } from '@/app/hooks/useElementSize';
import { calculateRowLayout, SizedImage } from '@/lib/size-images';
import { useInView } from '@/app/hooks/useInView';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { setUrlParams } from '@/lib/url';
import { Button } from './ui/button';
import Link from 'next/link';
import Routes from '@/lib/routes';

type ImageGalleryState = {
    loading: boolean;
    sliderValue: number;
    numberOfImagesPerRow: number;
    error?: string;
    loadedImages: number[];
    endReached: boolean;
};

const calcImagesPerRow = (val: number) => 12 - Math.floor((val / 100) * 12) + 2;
const sliderStartVal = 90; // 90 / 100

const initialState: ImageGalleryState = {
    loading: false,
    sliderValue: sliderStartVal,
    numberOfImagesPerRow: calcImagesPerRow(sliderStartVal),
    loadedImages: [],
    endReached: false,
};

export default function ImageGallery() {
    const [ref, size] = useElementSize<HTMLDivElement>();
    const [state, setState] = useState<ImageGalleryState>(initialState);
    const { images, loadNextBatch } = useContext(ImagesContext);
    const { loading, sliderValue, error, endReached, numberOfImagesPerRow } = state;
    const debounceSliderRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const scrollGap = images.length > 10 ? 12 : 0;

    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const selected = searchParams.get('selected');
    const mode = searchParams.get('mode') ?? 'info';

    const imagesLayout = useMemo(() => {
        if (size.width === 0) return images;
        return calculateRowLayout(images, numberOfImagesPerRow, size.width - scrollGap, 10);
    }, [images, numberOfImagesPerRow, size.width]);

    const [sentinelRef, isVisible] = useInView<HTMLDivElement>({
        rootMargin: '200px', // start loading a bit before it enters view
        threshold: 0.1,
    });

    // handle realtime resize of slider, unless more than 600 images in galler, then only updates 100ms after slider is still
    useEffect(() => {
        if (images.length < 2000) {
            setState((prev) => ({ ...prev, numberOfImagesPerRow: calcImagesPerRow(sliderValue) }));
            return;
        }
        clearTimeout(debounceSliderRef.current);
        debounceSliderRef.current = setTimeout(() => {
            setState((prev) => ({ ...prev, numberOfImagesPerRow: calcImagesPerRow(sliderValue) }));
            debounceSliderRef.current = undefined;
        }, 100);
    }, [images, sliderValue]);

    // detects if sentinal is visible, and loads more images if not loading or end reached
    useEffect(() => {
        if (!isVisible || loading || endReached) return;
        setState((prev) => ({ ...prev, loading: true }));
        loadNextBatch().then((error?: string | undefined) => {
            if (error === END_OF_DATA_MARK) return setState((prev) => ({ ...prev, loading: false, endReached: true }));
            if (error) return setState((prev) => ({ ...prev, error, endReached: true, loading: false }));
            setState((prev) => ({ ...prev, loading: false }));
        });
    }, [isVisible, loading, endReached]);

    const handleSelect = (id: string) => {
        if (selected === id) {
            router.replace(pathname);
            return;
        }
        setUrlParams({ pathname, searchParams, key: 'selected', value: id }, router);
    };

    const handleModeChange = (mode: string) => {
        setUrlParams({ pathname, searchParams, key: 'mode', value: mode }, router);
    };

    return (
        <>
            <div
                className="absolute w-full left-0 -mt-10 px-5 z-1000
                            bg-gradient-to-b from-white/90 to-gray-200/60 h-10 shadow 
                            flex justify-between items-center"
            >
                <div>
                    <Button onClick={() => handleModeChange('info')} variant="ghost" asChild>
                        <div
                            style={{ color: mode === 'info' ? undefined : 'black' }}
                            className="text-blue-700 cursor-pointer"
                        >
                            <Images className="size-5 -mr-1" />
                            Image Information
                        </div>
                    </Button>
                    <Button onClick={() => handleModeChange('exif')} variant="ghost" asChild>
                        <div
                            style={{ color: mode === 'exif' ? undefined : 'black' }}
                            className="text-blue-700 cursor-pointer"
                        >
                            <Camera className="size-5 -mr-1" />
                            Exif-Data
                        </div>
                    </Button>
                    <Button onClick={() => handleModeChange('location')} variant="ghost" asChild>
                        <div
                            style={{ color: mode === 'location' ? undefined : 'black' }}
                            className="text-blue-700 cursor-pointer"
                        >
                            <Map className="size-5 -mr-1" />
                            Location
                        </div>
                    </Button>
                    <Button onClick={() => handleModeChange('faces')} variant="ghost" asChild>
                        <div
                            style={{ color: mode === 'faces' ? undefined : 'black' }}
                            className="text-blue-700 cursor-pointer"
                        >
                            <UserRound className="size-5 -mr-1" />
                            Faces
                        </div>
                    </Button>
                    <Button onClick={() => handleModeChange('faces')} variant="ghost" asChild>
                        <Link href={Routes.DASHBOARD}>
                            <div className="flex gap-1">
                                <LayoutDashboard className="size-5" />
                                Dashboard
                            </div>
                        </Link>
                    </Button>
                </div>
                <div className="flex justify-end items-center">
                    <Minus />
                    <Slider
                        className="w-50 mx-2"
                        value={[sliderValue]}
                        max={100}
                        onValueChange={(val) =>
                            setState((prev) => (val.length > 0 ? { ...prev, sliderValue: val.shift() ?? 0 } : prev))
                        }
                        step={1}
                    />
                    <Plus />
                </div>
            </div>
            <div
                ref={ref}
                className="bg-black pt-2 flex flex-wrap gap-[10px] justify-between items-center"
                style={{ marginRight: scrollGap, paddingBottom: loading ? '0' : 20 }}
            >
                {size.width > 0 &&
                    imagesLayout.map((image, index) => (
                        <div key={`${image.source}_${index}`} className="relative">
                            {!state.loadedImages.includes(index) && image.source !== '__padding' && (
                                <div
                                    className="absolute bg-gradient-to-b from-gray-300 to-gray-400 flex justify-center items-center shadow"
                                    style={{ width: image.width, height: image.height }}
                                >
                                    <div className="animate-pulse">
                                        <Loader className="animate-spin" />
                                    </div>
                                </div>
                            )}
                            {image.source === '__padding' && (
                                <div className="bg-gray-900" style={{ width: image.width, height: image.height }} />
                            )}
                            {image.source !== '__padding' && (
                                <img
                                    src={`/api/images${image.source}`}
                                    className="mx-0"
                                    style={{
                                        width: image.width,
                                        height: image.height,
                                        border: selected === images[index].id ? '2px solid red' : '',
                                    }}
                                    key={image.source}
                                    width={image.width}
                                    height={image.height}
                                    alt={`gallery image: ${image.source}`}
                                    onLoad={() =>
                                        setState((prev) => ({
                                            ...prev,
                                            loadedImages: [...prev.loadedImages, index],
                                        }))
                                    }
                                    onClick={() => handleSelect(images[index].id)}
                                />
                            )}
                        </div>
                    ))}
                <div ref={sentinelRef} className="h-[1px]" />
                {error && <div className="text-red-400 p-5">Error: {error}</div>}
                {loading && size.width >= 0 && (
                    <div className="flex justify-center w-full py-5">
                        <Loader className="animate-spin text-white" />
                    </div>
                )}
            </div>
        </>
    );
}
