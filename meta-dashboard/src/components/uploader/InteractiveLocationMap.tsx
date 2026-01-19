"use client";

import { useEffect, useRef, useState } from 'react';
import { MapPin, Minus, Plus, Trash2, Move } from 'lucide-react';
import { GeoLocation } from '@/services/mutations.service';
import dynamic from 'next/dynamic';

// Types for custom pin locations
export interface CustomPinLocation {
    id: string;
    lat: number;
    lng: number;
    radius: number; // in km
    name: string;
}

interface InteractiveLocationMapProps {
    locations: GeoLocation[];
    customPins: CustomPinLocation[];
    onRemoveLocation: (key: string, type: string) => void;
    onAddCustomPin: (pin: CustomPinLocation) => void;
    onUpdateCustomPin: (pin: CustomPinLocation) => void;
    onRemoveCustomPin: (id: string) => void;
}

// Coordinates for known locations
const LOCATION_COORDS: Record<string, [number, number]> = {
    'US': [39.8, -98.5], 'CA': [56.1, -106.3], 'MX': [23.6, -102.5],
    'BR': [-14.2, -51.9], 'AR': [-38.4, -63.6], 'CO': [4.6, -74.3],
    'GB': [55.4, -3.4], 'DE': [51.2, 10.5], 'FR': [46.2, 2.2],
    'ES': [40.5, -3.7], 'IT': [41.9, 12.6], 'PT': [39.4, -8.2],
    'NL': [52.1, 5.3], 'BE': [50.5, 4.5], 'CH': [46.8, 8.2],
    'AT': [47.5, 14.6], 'PL': [51.9, 19.1], 'SE': [60.1, 18.6],
    'NO': [60.5, 8.5], 'DK': [56.3, 9.5], 'FI': [61.9, 25.7],
    'RU': [61.5, 105.3], 'UA': [48.4, 31.2], 'TR': [38.9, 35.2],
    'IL': [31.0, 34.9], 'AE': [23.4, 53.8], 'SA': [23.9, 45.1],
    'EG': [26.8, 30.8], 'ZA': [-30.6, 22.9], 'NG': [9.1, 8.7],
    'IN': [20.6, 79.0], 'PK': [30.4, 69.3], 'BD': [23.7, 90.4],
    'CN': [35.9, 104.2], 'JP': [36.2, 138.3], 'KR': [35.9, 127.8],
    'TH': [15.9, 100.9], 'VN': [14.1, 108.3], 'ID': [-0.8, 113.9],
    'MY': [4.2, 101.9], 'SG': [1.4, 103.8], 'PH': [12.9, 121.8],
    'AU': [-25.3, 133.8], 'NZ': [-40.9, 174.9],
};

function getLocationCoords(location: GeoLocation): [number, number] | null {
    if (location.country_code) {
        return LOCATION_COORDS[location.country_code.toUpperCase()] || null;
    }
    return null;
}

// Reverse geocoding using OpenStreetMap Nominatim (free)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
            { headers: { 'Accept-Language': 'en' } }
        );
        if (!response.ok) throw new Error('Geocoding failed');
        const data = await response.json();

        // Build a readable name from the response
        const address = data.address || {};
        const city = address.city || address.town || address.village || address.municipality || '';
        const state = address.state || address.region || '';
        const country = address.country || '';

        if (city && country) {
            return `${city}, ${country}`;
        } else if (state && country) {
            return `${state}, ${country}`;
        } else if (country) {
            return country;
        }
        return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }
}

// The actual map component - loaded dynamically to avoid SSR issues
function MapContent({
    locations,
    customPins,
    onRemoveLocation,
    onAddCustomPin,
    onUpdateCustomPin,
    onRemoveCustomPin,
}: InteractiveLocationMapProps) {
    const [L, setL] = useState<any>(null);
    const [MapComponents, setMapComponents] = useState<any>(null);
    const [selectedPin, setSelectedPin] = useState<string | null>(null);
    const mapRef = useRef<any>(null);

    // Dynamic import of leaflet on client side
    useEffect(() => {
        Promise.all([
            import('leaflet'),
            import('react-leaflet'),
        ]).then(([leaflet, reactLeaflet]) => {
            // Fix default marker icons
            delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl;
            leaflet.default.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });
            setL(leaflet.default);
            setMapComponents(reactLeaflet);
        });
    }, []);

    if (!L || !MapComponents) {
        return (
            <div className="w-full h-[300px] bg-gray-900 rounded-xl flex items-center justify-center">
                <div className="text-gray-500">Loading map...</div>
            </div>
        );
    }

    const { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents } = MapComponents;

    // Custom blue icon for locations
    const blueIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    // Custom red icon for custom pins
    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    // Click handler component
    function MapClickHandler() {
        useMapEvents({
            click: async (e: any) => {
                const { lat, lng } = e.latlng;
                const pinId = `pin-${Date.now()}`;

                // Add pin immediately with loading name
                const newPin: CustomPinLocation = {
                    id: pinId,
                    lat,
                    lng,
                    radius: 25,
                    name: 'Loading...',
                };
                onAddCustomPin(newPin);
                setSelectedPin(pinId);

                // Fetch actual location name
                const locationName = await reverseGeocode(lat, lng);
                onUpdateCustomPin({ ...newPin, name: locationName });
            },
        });
        return null;
    }

    // Radius control component
    function RadiusControl({ pin }: { pin: CustomPinLocation }) {
        const adjustRadius = (delta: number) => {
            const newRadius = Math.max(1, Math.min(500, pin.radius + delta));
            onUpdateCustomPin({ ...pin, radius: newRadius });
        };

        return (
            <div className="flex flex-col gap-2 min-w-[180px]">
                <div className="font-medium text-sm">{pin.name}</div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Radius:</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); adjustRadius(-5); }}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                    >
                        <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium min-w-[50px] text-center">{pin.radius} km</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); adjustRadius(5); }}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onRemoveCustomPin(pin.id); }}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                >
                    <Trash2 className="w-3 h-3" />
                    Remove pin
                </button>
            </div>
        );
    }

    return (
        <div className="relative z-0">
            <MapContainer
                ref={mapRef}
                center={[30, 20]}
                zoom={2}
                className="w-full h-[300px] rounded-xl"
                style={{ background: '#1f2937' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <MapClickHandler />

                {/* Render searched/selected locations */}
                {locations.map((loc) => {
                    const coords = getLocationCoords(loc);
                    if (!coords) return null;
                    return (
                        <Marker key={`${loc.type}-${loc.key}`} position={coords} icon={blueIcon}>
                            <Popup>
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium">{loc.display_name}</span>
                                    <span className="text-xs text-gray-500 capitalize">{loc.type}</span>
                                    <button
                                        onClick={() => onRemoveLocation(loc.key, loc.type)}
                                        className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 mt-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Remove
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Render custom pins with radius circles */}
                {customPins.map((pin) => (
                    <div key={pin.id}>
                        <Circle
                            center={[pin.lat, pin.lng]}
                            radius={pin.radius * 1000} // Convert km to meters
                            pathOptions={{
                                color: '#ef4444',
                                fillColor: '#ef4444',
                                fillOpacity: 0.15,
                                weight: 2,
                            }}
                        />
                        <Marker
                            position={[pin.lat, pin.lng]}
                            icon={redIcon}
                            draggable={true}
                            eventHandlers={{
                                dragend: async (e: any) => {
                                    const marker = e.target;
                                    const position = marker.getLatLng();
                                    // Update position immediately with loading name
                                    onUpdateCustomPin({
                                        ...pin,
                                        lat: position.lat,
                                        lng: position.lng,
                                        name: 'Loading...',
                                    });
                                    // Fetch new location name
                                    const locationName = await reverseGeocode(position.lat, position.lng);
                                    onUpdateCustomPin({
                                        ...pin,
                                        lat: position.lat,
                                        lng: position.lng,
                                        name: locationName,
                                    });
                                },
                            }}
                        >
                            <Popup>
                                <RadiusControl pin={pin} />
                            </Popup>
                        </Marker>
                    </div>
                ))}
            </MapContainer>

            {/* Instructions overlay */}
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                Click map to add pin
                <span className="text-gray-400">|</span>
                <Move className="w-3 h-3" />
                Drag to move
            </div>

            {/* Pin count */}
            {(locations.length > 0 || customPins.length > 0) && (
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {locations.length + customPins.length} location{locations.length + customPins.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
}

// Export with dynamic import to avoid SSR issues
export default function InteractiveLocationMap(props: InteractiveLocationMapProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="w-full h-[300px] bg-gray-900 rounded-xl flex items-center justify-center border border-gray-700">
                <div className="text-gray-500 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Loading map...
                </div>
            </div>
        );
    }

    return <MapContent {...props} />;
}
