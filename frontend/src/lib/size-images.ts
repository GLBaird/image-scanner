import { ImageData } from '@/app/actions/images';

export type SizedImage = {
    width: number;
    height: number;
    source: string;
};

export function calculateRowLayout(
    images: (ImageData | { width: number; height: number; source: string })[],
    imagesPerRow: number,
    containerWidth: number,
    gap: number,
): SizedImage[] {
    const rows: (typeof images)[] = [];
    for (let i = 0; i < images.length; i += imagesPerRow) {
        rows.push(images.slice(i, i + imagesPerRow));
    }

    // pad rows
    const paddedCount = imagesPerRow - (images.length % imagesPerRow);
    if (paddedCount < imagesPerRow) {
        const fr = rows.length - 1;
        rows[fr] = [
            ...rows[fr],
            ...[...new Array(paddedCount)].map(() => ({
                width: 200,
                height: 200,
                source: '__padding',
            })),
        ];
    }

    const layout: SizedImage[] = [];

    for (const row of rows) {
        // scale all images in the row to the same height so they fill the width
        const aspectRatios = row.map((img) => img.width / img.height);
        const totalAspectRatio = aspectRatios.reduce((a, b) => a + b, 0);
        const totalGap = (row.length - 1) * gap;
        const rowHeight = (containerWidth - totalGap) / totalAspectRatio;
        for (let i = 0; i < row.length; i++) {
            const ar = aspectRatios[i];
            const width = Math.floor(ar * rowHeight);
            layout.push({
                width,
                height: Math.floor(rowHeight),
                source: row[i].source,
            });
        }
    }

    return layout;
}
