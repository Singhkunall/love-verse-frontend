import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Marker Icon Fix (Default icons broken hote hain React mein)
const customIcon = new L.Icon({
    iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
    iconSize: [38, 38],
    iconAnchor: [19, 38],
});

// Helper: Map ko partner ki location pe move karne ke liye
function RecenterMap({ coords }) {
    const map = useMap();
    useEffect(() => {
        if (coords) map.setView([coords.lat, coords.lng], 15);
    }, [coords]);
    return null;
}

const LocationMap = ({ partnerCoords, partnerName }) => {
    return (
        <div className="h-full w-full rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl relative">
            <MapContainer 
                center={partnerCoords || [20.5937, 78.9629]} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {partnerCoords ? (
                    <Marker position={[partnerCoords.lat, partnerCoords.lng]} icon={customIcon}>
                        <Popup className="custom-popup">
                            <div className="font-black text-rose-500">{partnerName} yahan hai! ✨</div>
                        </Popup>
                        <RecenterMap coords={partnerCoords} />
                    </Marker>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[1000] backdrop-blur-md font-bold text-gray-500">
                        Partner ki location ka intezaar hai... 🕒
                    </div>
                )}
            </MapContainer>
        </div>
    );
};

export default LocationMap;