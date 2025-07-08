'use client';
import { Loader } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type Face = {
    hash: string;
    x: number;
    y: number;
    width: number;
    height: number;
};
export type FaceDisplayProps = {
    source: string;
    face: Face;
};
export default function FaceDisplay({ source, face }: FaceDisplayProps) {
    const [loaded, setLoaded] = useState(false);
    const imageRef = useRef<HTMLImageElement | undefined>(undefined);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const createImage = (src: string, onLoad: () => void) => {
        const img = new Image();
        img.src = src;
        img.onload = onLoad;
        return img;
    };

    useEffect(() => {
        imageRef.current = createImage(`/api/images${source}`, () => setLoaded(true));
    }, [source]);

    useEffect(() => {
        if (loaded && canvasRef.current && imageRef.current) {
            drawFace(imageRef.current, face, canvasRef.current);
        }
    }, [face, loaded, canvasRef, imageRef]);

    if (!loaded) {
        return (
            <div className="w-20 h-20 flex justify-center items-center bg-gray-400 rounded-full shadow animate-pulse">
                <Loader className="animate-spin" />
            </div>
        );
    }
    return (
        <div className="transition-transform hover:transform-[scale(2)]">
            <div className="rounded-full overflow-hidden shadow">
                <canvas width={100} height={100} ref={canvasRef} className="bg-amber-300" />
            </div>
        </div>
    );
}

function drawFace(imageData: HTMLImageElement, face: Face, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(imageData, face.x - 40, face.y - 40, face.width + 80, face.height + 80, 0, 0, 100, 100);
}
