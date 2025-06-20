'use client';
import { createContext, useState } from 'react';
import { getBatchSize, getImages, ImageData } from '../actions/images';

export type ImageContextData = {
    images: ImageData[];
    loadNextBatch: () => Promise<string | undefined>;
    drawFaces: boolean;
    changeDrawState: (state: boolean) => void;
};

export const ImagesContext = createContext<ImageContextData>({
    images: [],
    loadNextBatch: async () => undefined,
    drawFaces: false,
    changeDrawState: () => undefined,
});

export const END_OF_DATA_MARK = '__end_of_data_mark__';

export type ImagesContextProviderProps = { jobId: string; images: ImageData[]; children: React.ReactNode };
export default function ImagesContextProvider({ jobId, images, children }: ImagesContextProviderProps) {
    const [imageState, setImageState] = useState(images);
    const [drawFaces, setDrawFaces] = useState(false);

    /** Returns a string if there is an error or end of data*/
    const loadNextBatch = async (): Promise<string | undefined> => {
        const BATCH_SIZE = await getBatchSize();
        const cursor = imageState[imageState.length - 1].id;
        const update = await getImages(jobId, cursor);
        if (update.errors && update.errors.length > 0) {
            return update.errors.join(', ');
        }
        if (!update.images) return 'failed to load any images';
        if (update.images.length < BATCH_SIZE) return END_OF_DATA_MARK;
        setImageState([...imageState, ...update.images]);
        return undefined;
    };

    const changeDrawState = (state: boolean) => setDrawFaces(state);

    return (
        <ImagesContext value={{ images: imageState, loadNextBatch, drawFaces, changeDrawState }}>
            {children}
        </ImagesContext>
    );
}
