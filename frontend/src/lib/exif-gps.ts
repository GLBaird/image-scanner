function convertDMSToDD(dms: number[], ref: string): number | null {
    if (!dms || dms.length !== 3 || !ref) return null;

    const [degrees, minutes, seconds] = dms;
    let dd = degrees + minutes / 60 + seconds / 3600;

    if (ref === 'S' || ref === 'W') {
        dd = -dd;
    }

    return dd;
}

export function getLatLonFromExif(exif: any): { lat: number; lon: number } | null {
    const { GPSLatitude, GPSLatitudeRef, GPSLongitude, GPSLongitudeRef, latitude, longitude } = exif;

    if (latitude && longitude) return { lat: latitude, lon: longitude };

    if (!GPSLatitude || !GPSLongitude || !GPSLatitudeRef || !GPSLongitudeRef) return null;

    const lat = convertDMSToDD(GPSLatitude, GPSLatitudeRef);
    const lon = convertDMSToDD(GPSLongitude, GPSLongitudeRef);

    if (lat === null || lon === null) return null;

    return { lat, lon };
}
