'use client';
import { useEffect, useRef } from 'react';
import { Face } from './FaceDisplay';
import { SizedImage } from '@/lib/size-images';
import { ImageData } from '@/app/actions/images';

export type FaceBoxesProps = {
    sizedImage: SizedImage;
    image: ImageData;
};
export default function FaceBoxes({ sizedImage, image }: FaceBoxesProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        if (!canvasRef.current || !image) return;
        const translator = makeCooordinateTranslater(image.width, image.height, sizedImage.width, sizedImage.height);
        drawBoxes(
            canvasRef.current,
            image.faces.map((f) => translator(f)),
        );
    }, [canvasRef, sizedImage, image]);
    return (
        <canvas
            ref={canvasRef}
            className="absolute bg-transparent pointer-events-none"
            width={sizedImage.width}
            height={sizedImage.height}
        />
    );
}

function makeCooordinateTranslater(
    width: number,
    height: number,
    sizedWidth: number,
    sizedHeight: number,
): (face: Face) => { x: number; y: number; w: number; h: number } {
    const xRatio = sizedWidth / width;
    const yRatio = sizedHeight / height;
    return (face: Face) => ({
        x: face.x * xRatio,
        y: face.y * yRatio,
        w: face.width * xRatio,
        h: face.height * yRatio,
    });
}

function drawBoxes(canvas: HTMLCanvasElement, faces: { x: number; y: number; w: number; h: number }[]) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    faces.forEach((face) => {
        ctx.beginPath();
        ctx.strokeRect(face.x, face.y, face.w, face.h);
        ctx.fill();
    });
}
