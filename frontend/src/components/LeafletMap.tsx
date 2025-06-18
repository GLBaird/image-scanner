// LeafletMap.tsx
import React, { useEffect, FC } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type GeoPositionDataExif = {};

const DefaultIcon = L.icon({
    iconUrl: '/marker-icon.png',
    shadowUrl: '/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LeafletMapProps {
    latitude: number;
    longitude: number;
    zoom?: number;
}

// 🔍 Zoom Buttons inside Map
const ZoomButtons: FC = () => {
    const map = useMap();

    return (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
            <button onClick={() => map.zoomIn()} style={{ display: 'block', marginBottom: 5 }}>
                Zoom In
            </button>
            <button onClick={() => map.zoomOut()}>Zoom Out</button>
        </div>
    );
};

const RecenterMap = ({ center }: { center: [number, number] }) => {
    const map = useMap();

    useEffect(() => {
        map.setView(center);
    }, [center.join(',')]); // Avoid unnecessary updates

    return null;
};

const LeafletMap: FC<LeafletMapProps> = ({ latitude, longitude, zoom = 13 }) => {
    const center: [number, number] = [latitude, longitude];

    return (
        <div style={{ height: '400px', width: '100%', position: 'relative' }}>
            <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={center} />
                <RecenterMap center={center} />
                <ZoomButtons />
            </MapContainer>
        </div>
    );
};

export default LeafletMap;
