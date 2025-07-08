import { getImages } from '@/app/actions/images';
import ImageGallery from '@/components/ImageGallery';
import ImagesContextProvider from '@/app/contexts/images';
import GallerySidePanel from '@/components/GallerySidePanel';

export default async function Gallery({ params }: { params: Promise<{ jobId: string }> }) {
    const { jobId } = await params;

    const { errors, images } = await getImages(jobId);

    return (
        <>
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
            <div className="w-full h-[calc(100vh-7.5em)] flex justify-self-stretch items-stretch">
                <ImagesContextProvider jobId={jobId} images={images ?? []}>
                    <GallerySidePanel />
                    <div className="bg-gradient-to-r from-gray-50 to-gray-200 grow scroll-container pt-10">
                        <ImageGallery />
                    </div>
                </ImagesContextProvider>
            </div>
        </>
    );
}
