"use client";

import { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { useWizard } from './WizardContext';
import WizardNavigation from './WizardNavigation';
import InteractiveLocationMap, { CustomPinLocation } from '@/components/uploader/InteractiveLocationMap';
import { mutationsService, GeoLocation } from '@/services/mutations.service';

interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
    fbLocale: string;
}

export default function Step2Location({ t, fbLocale }: Props) {
    const { state, dispatch } = useWizard();
    const [locationSearch, setLocationSearch] = useState('');
    const [locationResults, setLocationResults] = useState<GeoLocation[]>([]);
    const [isSearchingLocations, setIsSearchingLocations] = useState(false);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);

    // Search locations on input change
    useEffect(() => {
        if (locationSearch.length < 2) {
            setLocationResults([]);
            setShowLocationDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingLocations(true);
            try {
                const results = await mutationsService.searchLocations(locationSearch, ['country', 'region', 'city'], fbLocale);
                setLocationResults(results);
                setShowLocationDropdown(true);
            } catch (e) {
                console.error('Location search failed:', e);
            } finally {
                setIsSearchingLocations(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [locationSearch, fbLocale]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setShowLocationDropdown(false);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const addLocation = (loc: GeoLocation) => {
        if (!state.selectedLocations.some(l => l.key === loc.key && l.type === loc.type)) {
            dispatch({ type: 'SET_LOCATIONS', locations: [...state.selectedLocations, loc] });
        }
        setLocationSearch('');
        setShowLocationDropdown(false);
    };

    const removeLocation = (key: string, type: string) => {
        dispatch({
            type: 'SET_LOCATIONS',
            locations: state.selectedLocations.filter(l => !(l.key === key && l.type === type))
        });
    };

    const addCustomPin = useCallback((pin: CustomPinLocation) => {
        dispatch({ type: 'ADD_CUSTOM_PIN', pin });
    }, [dispatch]);

    const updateCustomPin = useCallback((id: string, updates: Partial<CustomPinLocation>) => {
        dispatch({ type: 'UPDATE_CUSTOM_PIN', id, updates });
    }, [dispatch]);

    const removeCustomPin = useCallback((id: string) => {
        dispatch({ type: 'REMOVE_CUSTOM_PIN', id });
    }, [dispatch]);

    const canProceed = state.selectedLocations.length > 0 || state.customPins.length > 0;

    const handleNext = () => {
        if (canProceed) {
            dispatch({ type: 'SET_STEP', step: 4 });
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-200">{t('wizard.step_2_title')}</h2>

            {/* Location Search */}
            <div className="space-y-2 relative z-20">
                <label className="text-sm font-medium text-gray-400">{t('wizard.location')}</label>
                <div>
                    <div
                        className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Search className="w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={locationSearch}
                            onChange={(e) => setLocationSearch(e.target.value)}
                            onFocus={() => locationResults.length > 0 && setShowLocationDropdown(true)}
                            placeholder={t('wizard.search_location')}
                            className="flex-1 bg-transparent outline-none text-sm"
                        />
                        {isSearchingLocations && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                    </div>

                    {/* Dropdown Results */}
                    {showLocationDropdown && locationResults.length > 0 && (
                        <div
                            className="absolute w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto"
                            style={{ zIndex: 2000 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {locationResults.map((loc) => (
                                <button
                                    key={`${loc.type}-${loc.key}`}
                                    onClick={() => addLocation(loc)}
                                    className="w-full px-3 py-2 text-left hover:bg-gray-800 flex items-center gap-2 text-sm border-b border-gray-800 last:border-b-0"
                                >
                                    <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-white">{loc.display_name}</span>
                                        <span className="text-gray-500 text-xs ml-2 capitalize">({loc.type})</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Locations + Custom Pins */}
                {(state.selectedLocations.length > 0 || state.customPins.length > 0) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {/* Searched locations (blue) */}
                        {state.selectedLocations.map((loc) => (
                            <div
                                key={`${loc.type}-${loc.key}`}
                                className="flex items-center gap-1 bg-blue-500/20 border border-blue-500/30 rounded-full px-3 py-1 text-sm"
                            >
                                <MapPin className="w-3 h-3 text-blue-400" />
                                <span className="text-blue-200">{loc.display_name}</span>
                                <button
                                    onClick={() => removeLocation(loc.key, loc.type)}
                                    className="ml-1 text-blue-400 hover:text-red-400"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {/* Custom pins (orange) */}
                        {state.customPins.map((pin) => (
                            <div
                                key={pin.id}
                                className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/30 rounded-full px-3 py-1 text-sm"
                            >
                                <MapPin className="w-3 h-3 text-orange-400" />
                                <span className="text-orange-200">{pin.name}</span>
                                <span className="text-orange-400/60 text-xs">({pin.radius}km)</span>
                                <button
                                    onClick={() => removeCustomPin(pin.id)}
                                    className="ml-1 text-orange-400 hover:text-orange-300"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {state.selectedLocations.length === 0 && state.customPins.length === 0 && (
                    <p className="text-xs text-gray-500">{t('wizard.add_location_hint')}</p>
                )}

                {/* Interactive Location Map */}
                <InteractiveLocationMap
                    locations={state.selectedLocations}
                    customPins={state.customPins}
                    onRemoveLocation={removeLocation}
                    onAddCustomPin={addCustomPin}
                    onUpdateCustomPin={updateCustomPin}
                    onRemoveCustomPin={removeCustomPin}
                />
            </div>

            <WizardNavigation
                onNext={handleNext}
                canProceed={canProceed}
                nextLabel={t('common.next') || 'Next'}
                backLabel={t('common.back') || 'Back'}
            />
        </div>
    );
}
