"use client";

import React, { useEffect, useRef, useState } from 'react';
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
    onUpdateCustomPin: (id: string, updates: Partial<CustomPinLocation>) => void;
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

// Cache for geocoded coordinates
const geocodeCache: Record<string, [number, number]> = {};

// Forward geocoding using OpenStreetMap Nominatim (free)
async function forwardGeocode(query: string): Promise<[number, number] | null> {
    // Check cache first
    if (geocodeCache[query]) {
        return geocodeCache[query];
    }
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
            { headers: { 'Accept-Language': 'en' } }
        );
        if (!response.ok) return null;
        const data = await response.json();
        if (data && data.length > 0) {
            const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            geocodeCache[query] = coords;
            return coords;
        }
        return null;
    } catch (error) {
        console.error('Forward geocoding error:', error);
        return null;
    }
}

function getLocationCoords(location: GeoLocation): [number, number] | null {
    // Use API-provided coordinates first (for cities/regions)
    if (location.latitude && location.longitude) {
        return [location.latitude, location.longitude];
    }
    // Check geocode cache
    const cacheKey = location.display_name || location.name;
    if (geocodeCache[cacheKey]) {
        return geocodeCache[cacheKey];
    }
    // Fallback to hardcoded country coordinates
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
    const [isPinMode, setIsPinMode] = useState(false);
    const [geocodeTrigger, setGeocodeTrigger] = useState(0); // Trigger re-render when geocode completes
    const mapRef = useRef<any>(null);
    const prevPointCountRef = useRef(0);
    const isPinModeRef = useRef(isPinMode);
    const lastProcessedLocationLengthRef = useRef(locations.length); // Track processed locations

    // Keep ref in sync with state
    useEffect(() => {
        isPinModeRef.current = isPinMode;
    }, [isPinMode]);

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

    // Custom orange icon for custom pins
    const orangeIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    // Component to geocode new locations and zoom to them once
    function GeocodeAndZoom() {
        const map = MapComponents.useMap();

        useEffect(() => {
            // Only run when a new location is added (use parent-level ref to persist across re-renders)
            if (locations.length <= lastProcessedLocationLengthRef.current) {
                return;
            }

            // Get the newest location
            const newLoc = locations[locations.length - 1];
            lastProcessedLocationLengthRef.current = locations.length;

            const processNew = async () => {
                let coords: [number, number] | null = null;

                if (newLoc.latitude && newLoc.longitude) {
                    coords = [newLoc.latitude, newLoc.longitude];
                } else {
                    const query = newLoc.display_name || newLoc.name;
                    coords = await forwardGeocode(query);
                    if (!coords && newLoc.country_code) {
                        coords = LOCATION_COORDS[newLoc.country_code.toUpperCase()] || null;
                    }
                    setGeocodeTrigger(prev => prev + 1);
                }

                if (coords) {
                    map.setView(coords, 6);
                }
            };

            processNew();
        }, [locations.length, map]);

        return null;
    }

    // Get resolved coordinates for a location (for marker rendering)
    const getResolvedCoords = (loc: GeoLocation): [number, number] | null => {
        // First check API coords
        if (loc.latitude && loc.longitude) {
            return [loc.latitude, loc.longitude];
        }
        // Check cache
        const cacheKey = loc.display_name || loc.name;
        if (geocodeCache[cacheKey]) {
            return geocodeCache[cacheKey];
        }
        // Fallback to country
        if (loc.country_code) {
            return LOCATION_COORDS[loc.country_code.toUpperCase()] || null;
        }
        return null;
    };

    // Click handler component
    function MapClickHandler() {
        const map = MapComponents.useMap();

        useMapEvents({
            click: async (e: any) => {
                // Only add pin when pin mode is active (use ref for latest value)
                if (!isPinModeRef.current) return;

                const { lat, lng } = e.latlng;
                const pinId = `pin-${Date.now()}`;

                // Deactivate pin mode first
                setIsPinMode(false);

                // Zoom to the clicked location
                map.flyTo([lat, lng], 8, { duration: 0.5 });

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
                onUpdateCustomPin(pinId, { name: locationName });
            },
        });
        return null;
    }

    // Radius control component
    function RadiusControl({ pin }: { pin: CustomPinLocation }) {
        const adjustRadius = (delta: number) => {
            const newRadius = Math.max(1, Math.min(500, pin.radius + delta));
            onUpdateCustomPin(pin.id, { radius: newRadius });
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
        <div className="relative h-[300px]">
            <MapContainer
                ref={mapRef}
                center={[30, 20]}
                zoom={2}
                className="w-full h-full rounded-xl"
                style={{ background: '#1f2937' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <MapClickHandler />
                <GeocodeAndZoom />

                {/* Render searched/selected locations */}
                {locations.map((loc) => {
                    const coords = getResolvedCoords(loc);
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
                    <React.Fragment key={pin.id}>
                        <Circle
                            center={[pin.lat, pin.lng]}
                            radius={pin.radius * 1000} // Convert km to meters
                            pathOptions={{
                                color: '#f97316',
                                fillColor: '#f97316',
                                fillOpacity: 0.15,
                                weight: 2,
                            }}
                        />
                        <Marker
                            position={[pin.lat, pin.lng]}
                            icon={orangeIcon}
                            draggable={true}
                            eventHandlers={{
                                dragend: async (e: any) => {
                                    const marker = e.target;
                                    const position = marker.getLatLng();
                                    // Update position immediately with loading name
                                    onUpdateCustomPin(pin.id, {
                                        lat: position.lat,
                                        lng: position.lng,
                                        name: 'Loading...',
                                    });
                                    // Fetch new location name
                                    const locationName = await reverseGeocode(position.lat, position.lng);
                                    onUpdateCustomPin(pin.id, {
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
                    </React.Fragment>
                ))}
            </MapContainer>

            {/* Drop Pin button - bottom right corner */}
            <button
                onClick={() => setIsPinMode(!isPinMode)}
                style={{ zIndex: 1000 }}
                className={`absolute bottom-2 right-2 px-3 py-1.5 rounded flex items-center gap-2 text-sm transition-colors shadow-lg ${
                    isPinMode
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
            >
                <MapPin className="w-4 h-4" />
                {isPinMode ? 'Click map to place' : 'Drop Pin'}
            </button>

            {/* Instructions overlay */}
            <div
                style={{ zIndex: 1000 }}
                className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-2"
            >
                <Move className="w-3 h-3" />
                Drag pins to move
            </div>

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
