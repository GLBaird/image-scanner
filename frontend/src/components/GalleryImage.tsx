import { SizedImage } from '@/lib/size-images';

export type GalleryImageProps = {
    id: string;
    image: SizedImage;
    onClick: (id: string) => void;
    onLoad: () => void;
    selected: boolean;
};
const GalleryImage = ({ image, id, onClick, onLoad, selected }: GalleryImageProps) => (
    <img
        src={`/api/images${image.source}`}
        className="mx-0"
        style={{
            width: image.width,
            height: image.height,
            border: selected ? '2px solid red' : '',
        }}
        key={image.source}
        width={image.width}
        height={image.height}
        alt={`gallery image: ${image.source}`}
        onLoad={onLoad}
        onClick={() => onClick(id)}
    />
);

export default GalleryImage;
