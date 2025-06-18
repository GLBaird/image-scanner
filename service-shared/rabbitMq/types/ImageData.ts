type ImageData = {
    id: string;
    filename: string;
    mimetype: string;
    filesize: number | string;
    width: number;
    height: number;
    format: string;
    colorspace: string;
    resolution: string;
    depth: number;
    source: string;
    createdAt: string;
    md5: string;
    sha1: string;
};

export default ImageData;
