'use client';

import { Loader, Minus, Plus } from 'lucide-react';
import { Slider } from './ui/slider';
import { useMemo, useContext, useState, useEffect, useRef } from 'react';
import { END_OF_DATA_MARK, ImagesContext } from '@/app/contexts/images';
import { useElementSize } from '@/app/hooks/useElementSize';
import { calculateRowLayout, SizedImage } from '@/lib/size-images';
import { useInView } from '@/app/hooks/useInView';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { setUrlParams } from '@/lib/url';
import FaceBoxes from './FaceBoxes';
import GalleryImagePreloader from './GalleryImagePreloader';
import GalleryPaddingImage from './GalleryPaddingImage';
import GalleryImage from './GalleryImage';
import GalleryOptions from './GalleryOptions';

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
    const { images, loadNextBatch, drawFaces } = useContext(ImagesContext);
    const { loading, sliderValue, error, endReached, numberOfImagesPerRow } = state;
    const debounceSliderRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const scrollGap = images.length > 10 ? 12 : 0;

    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const selected = searchParams.get('selected');

    const imagesLayout = useMemo(() => {
        if (size.width === 0) return images;
        return calculateRowLayout(images, numberOfImagesPerRow, size.width - scrollGap, 10);
    }, [images, numberOfImagesPerRow, size.width]);

    const [sentinelRef, isVisible] = useInView<HTMLDivElement>({
        rootMargin: '500px', // start loading a bit before it enters view
        threshold: 0.5,
    });

    const isImageLoaded = (index: number) => state.loadedImages.includes(index);
    const isImageSelected = (index: number) => selected === images[index].id;
    const isImageForPadding = (image: SizedImage) => image.source === '__padding';

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

    // handle image being selected to show info
    const handleSelect = (id: string) => {
        if (selected === id) {
            router.replace(pathname);
            return;
        }
        setUrlParams({ pathname, searchParams, key: 'selected', value: id }, router);
    };

    return (
        <>
            {/* Gallery Control Strip */}
            <div
                className="absolute w-full left-0 -mt-10 px-5 z-1000
                            bg-gradient-to-b from-white/90 to-gray-200/60 h-10 shadow 
                            flex flex-col
                            justify-center items-center
                            md:flex-row md:justify-between"
            >
                {/* Side Panel Option Buttons */}
                <div className="hidden text-[0.7rem] md:block lg:text-[1rem]">
                    <GalleryOptions />
                </div>

                {/* Image Size Slider */}
                <div className="flex justify-end items-center">
                    <Minus />
                    <Slider
                        className="w-50 md:w-30 lg:w-50 mx-2"
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

            {/* Main Image Gallery */}
            <div
                ref={ref}
                className="bg-black pt-2 flex flex-wrap gap-[10px] justify-between items-center"
                style={{ marginRight: scrollGap, paddingBottom: loading ? '0' : 20 }}
            >
                {size.width > 0 &&
                    imagesLayout.map((image, index) => (
                        <div key={`${image.source}_${index}`} className="relative">
                            {!isImageLoaded(index) && image.source !== '__padding' && (
                                <GalleryImagePreloader width={image.width} height={image.height} />
                            )}

                            {isImageForPadding(image) && (
                                <GalleryPaddingImage width={image.width} height={image.height} />
                            )}

                            {
                                // MAIN GALLERY IMAGE
                                !isImageForPadding(image) && (
                                    <>
                                        {drawFaces && <FaceBoxes image={images[index]} sizedImage={image} />}

                                        <GalleryImage
                                            id={images[index].id}
                                            image={image}
                                            selected={isImageSelected(index)}
                                            onClick={handleSelect}
                                            onLoad={() =>
                                                setState((prev) => ({
                                                    ...prev,
                                                    loadedImages: [...prev.loadedImages, index],
                                                }))
                                            }
                                        />
                                    </>
                                )
                            }
                        </div>
                    ))}
                {/* Sentinel for prompting lazy loading of more images if scrolled into view */}
                {size.width > 0 && <div ref={sentinelRef} className="h-[1px]" />}
                {/* Render Loading Error */}
                {error && <div className="text-red-400 p-5">Error: {error}</div>}
                {/* GALLERY LOADING MORE IMAGES SPINNER */}
                {loading && size.width >= 0 && (
                    <div className="flex justify-center w-full py-5">
                        <Loader className="animate-spin text-white" />
                    </div>
                )}
            </div>
        </>
    );
}
