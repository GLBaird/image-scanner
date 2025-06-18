import { getImages } from '@/app/actions/images';
import CacheTags from '@/lib/cache-tags';
import ImageGallery from '@/components/ImageGallery';
import ImagesContextProvider from '@/app/contexts/images';
import GallerySidePanel from '@/components/GallerySidePanel';

export const revalidate = 300;
export const fetchCacheTags = [CacheTags.images];

export default async function Gallery({ params }: { params: Promise<{ jobId: string }> }) {
    const { jobId } = await params;

    const { errors, images } = await getImages(jobId);

    return (
        <>
            <div className="w-full h-[calc(100vh-7.5em)] flex justify-self-stretch items-stretch">
                <ImagesContextProvider jobId={jobId} images={images ?? []}>
                    <div
                        className="bg-gradient-to-b from-gray-300 to-gray-100 shadow-2xl shrink-0 scroll-container pt-10
                                    w-80 xl:w-100"
                    >
                        <GallerySidePanel />
                    </div>
                    <div className="bg-gradient-to-r from-gray-50 to-gray-200 grow scroll-container pt-10">
                        {errors && errors.length > 0 && (
                            <div className="m-5">
                                <h2>Errors</h2>
                                <p>There have been error while attempting to load image data for gallery.</p>
                                <ul className="list-disc ml-10 text-red-700">
                                    {errors.map((error) => (
                                        <li key={error}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <ImageGallery />
                    </div>
                </ImagesContextProvider>
            </div>
        </>
    );
}
