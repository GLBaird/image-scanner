import { Loader } from 'lucide-react';

export type GalleryImagePreloaderProps = {
    width: number;
    height: number;
};
export default function GalleryImagePreloader({ width, height }: GalleryImagePreloaderProps) {
    return (
        <div
            className="absolute 
                       bg-gradient-to-b from-gray-300 to-gray-400 
                       flex justify-center items-center shadow"
            style={{ width: width, height: height }}
        >
            <div className="animate-pulse">
                <Loader className="animate-spin" />
            </div>
        </div>
    );
}
