"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, CheckCircle, Upload, Loader2, Search, MapPin, X
} from 'lucide-react';
import { mutationsService, GeoLocation, UpdateAdSetTargetingRequest, UpdateAdCreativeRequest, AdSetTargeting, AdCreativeData } from '../../../../services/mutations.service';
import { useAccount } from '../../../../context/AccountContext';

type EditMode = 'adset' | 'ad';

export default function EditPage() {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;
    const { selectedAccountId, linkedAccounts } = useAccount();
    const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);

    // Mode selection
    const [editMode, setEditMode] = useState<EditMode>('adset');

    // Data Loading State
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [adSets, setAdSets] = useState<any[]>([]);
    const [ads, setAds] = useState<any[]>([]);
    const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
    const [isLoadingAdSets, setIsLoadingAdSets] = useState(false);
    const [isLoadingAds, setIsLoadingAds] = useState(false);

    // Selection State
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
    const [selectedAdSetId, setSelectedAdSetId] = useState<string>('');
    const [selectedAdId, setSelectedAdId] = useState<string>('');

    // AdSet Edit State
    const [selectedLocations, setSelectedLocations] = useState<GeoLocation[]>([]);
    const [locationSearch, setLocationSearch] = useState('');
    const [locationResults, setLocationResults] = useState<GeoLocation[]>([]);
    const [isSearchingLocations, setIsSearchingLocations] = useState(false);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [ageMin, setAgeMin] = useState(18);
    const [ageMax, setAgeMax] = useState(65);
    const [isLoadingCurrentData, setIsLoadingCurrentData] = useState(false);

    // Ad Edit State
    const [adCreative, setAdCreative] = useState({
        title: '',
        body: '',
        cta: 'LEARN_MORE',
        link: '',
        file: null as File | null,
        previewUrl: null as string | null,
        leadFormId: ''
    });
    const [leadForms, setLeadForms] = useState<any[]>([]);
    const [isLoadingForms, setIsLoadingForms] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Fetch Campaigns
    useEffect(() => {
        if (selectedAccountId) {
            loadCampaigns(selectedAccountId);
        }
    }, [selectedAccountId]);

    // Fetch AdSets when Campaign changes
    useEffect(() => {
        if (selectedCampaignId) {
            loadAdSets(selectedCampaignId);
        } else {
            setAdSets([]);
            setSelectedAdSetId('');
        }
    }, [selectedCampaignId]);

    // Fetch Ads when AdSet changes (only for ad edit mode)
    useEffect(() => {
        if (editMode === 'ad' && selectedAdSetId) {
            loadAds(selectedAdSetId);
        } else {
            setAds([]);
            setSelectedAdId('');
        }
    }, [selectedAdSetId, editMode]);

    // Fetch current ad set targeting when ad set is selected (in adset edit mode)
    useEffect(() => {
        if (editMode === 'adset' && selectedAdSetId) {
            loadAdSetTargeting(selectedAdSetId);
        }
    }, [selectedAdSetId, editMode]);

    // Fetch current ad creative when ad is selected (in ad edit mode)
    useEffect(() => {
        if (editMode === 'ad' && selectedAdId) {
            loadAdCreative(selectedAdId);
        }
    }, [selectedAdId, editMode]);

    // Location search with debounce
    useEffect(() => {
        if (locationSearch.length < 2) {
            setLocationResults([]);
            setShowLocationDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingLocations(true);
            try {
                const results = await mutationsService.searchLocations(locationSearch);
                const filtered = results.filter(
                    r => !selectedLocations.some(s => s.key === r.key && s.type === r.type)
                );
                setLocationResults(filtered);
                setShowLocationDropdown(true);
            } catch (err) {
                console.error('Location search failed:', err);
                setLocationResults([]);
            } finally {
                setIsSearchingLocations(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [locationSearch, selectedLocations]);

    const loadCampaigns = async (accId: string) => {
        setIsLoadingCampaigns(true);
        try {
            const data = await mutationsService.getCampaignsList(accId);
            setCampaigns(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingCampaigns(false);
        }
    };

    const loadAdSets = async (campId: string) => {
        setIsLoadingAdSets(true);
        try {
            const data = await mutationsService.getAdSetsList(campId);
            setAdSets(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingAdSets(false);
        }
    };

    const loadAds = async (adsetId: string) => {
        setIsLoadingAds(true);
        try {
            const data = await mutationsService.getAdsList(adsetId);
            setAds(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingAds(false);
        }
    };

    const loadLeadForms = async () => {
        if (!selectedAccount?.page_id || !selectedAccount?.account_id) return;
        setIsLoadingForms(true);
        try {
            const forms = await mutationsService.getLeadForms(selectedAccount.page_id, selectedAccount.account_id);
            setLeadForms(forms);
        } catch (e) {
            console.error("Failed to load lead forms", e);
            setLeadForms([]);
        } finally {
            setIsLoadingForms(false);
        }
    };

    const loadAdSetTargeting = async (adsetId: string) => {
        setIsLoadingCurrentData(true);
        try {
            const data = await mutationsService.getAdSetTargeting(adsetId);
            // Pre-fill form with current values
            setSelectedLocations(data.locations || []);
            setAgeMin(data.age_min || 18);
            setAgeMax(data.age_max || 65);
        } catch (e) {
            console.error("Failed to load ad set targeting", e);
        } finally {
            setIsLoadingCurrentData(false);
        }
    };

    const loadAdCreative = async (adId: string) => {
        setIsLoadingCurrentData(true);
        try {
            const data = await mutationsService.getAdCreative(adId);
            // Pre-fill form with current values
            setAdCreative(prev => ({
                ...prev,
                title: data.title || '',
                body: data.body || '',
                cta: data.call_to_action || 'LEARN_MORE',
                link: data.link_url || '',
                leadFormId: data.lead_form_id || ''
            }));
        } catch (e) {
            console.error("Failed to load ad creative", e);
        } finally {
            setIsLoadingCurrentData(false);
        }
    };

    // Load lead forms when in ad edit mode
    useEffect(() => {
        if (editMode === 'ad' && selectedAccount?.page_id && leadForms.length === 0 && !isLoadingForms) {
            loadLeadForms();
        }
    }, [editMode, selectedAccount?.page_id]);

    const addLocation = (location: GeoLocation) => {
        setSelectedLocations(prev => [...prev, location]);
        setLocationSearch('');
        setLocationResults([]);
        setShowLocationDropdown(false);
    };

    const removeLocation = (key: string, type: string) => {
        setSelectedLocations(prev => prev.filter(l => !(l.key === key && l.type === type)));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAdCreative(prev => ({
                ...prev,
                file: file,
                previewUrl: URL.createObjectURL(file)
            }));
        }
    };

    const handleSubmitAdSet = async () => {
        if (!selectedAdSetId) {
            setError("Please select an ad set to edit");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const payload: UpdateAdSetTargetingRequest = {};

            if (selectedLocations.length > 0) {
                payload.geo_locations = selectedLocations.map(loc => ({
                    key: loc.key,
                    type: loc.type,
                    name: loc.name,
                    country_code: loc.country_code
                }));
            }

            payload.age_min = ageMin;
            payload.age_max = ageMax;

            await mutationsService.updateAdSetTargeting(selectedAdSetId, payload);
            setSuccess("Ad Set updated successfully!");

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to update ad set. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitAd = async () => {
        if (!selectedAdId) {
            setError("Please select an ad to edit");
            return;
        }

        if (!selectedAccount?.page_id) {
            setError("No Facebook Page connected. Please reconnect in Settings.");
            return;
        }

        // At least one field should be changed
        if (!adCreative.title && !adCreative.body && !adCreative.file && !adCreative.link && !adCreative.leadFormId) {
            setError("Please make at least one change");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            let imageHash = undefined;
            let videoId = undefined;

            // Upload new media if provided
            if (adCreative.file) {
                const isVideo = adCreative.file.type.startsWith('video/');
                const uploadRes = await mutationsService.uploadMedia(
                    selectedAccountId!,
                    adCreative.file,
                    isVideo
                );
                if (isVideo) videoId = uploadRes.video_id;
                else imageHash = uploadRes.image_hash;
            }

            const payload: UpdateAdCreativeRequest = {
                account_id: selectedAccountId!,
                page_id: selectedAccount.page_id!,
                title: adCreative.title || undefined,
                body: adCreative.body || undefined,
                call_to_action: adCreative.cta !== 'LEARN_MORE' ? adCreative.cta : undefined,
                link_url: adCreative.link || undefined,
                lead_form_id: adCreative.leadFormId || undefined,
                image_hash: imageHash,
                video_id: videoId
            };

            await mutationsService.updateAdCreative(selectedAdId, payload);
            setSuccess("Ad updated successfully!");

            // Reset form
            setAdCreative({
                title: '',
                body: '',
                cta: 'LEARN_MORE',
                link: '',
                file: null,
                previewUrl: null,
                leadFormId: ''
            });

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to update ad. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Breadcrumb */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push(`/${locale}/uploader`)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Uploader
                    </button>
                </div>

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold">Edit Ad Set or Ad</h1>
                    <p className="text-gray-400 mt-1">Modify targeting, copy, or media on existing items</p>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-4">
                    <button
                        onClick={() => { setEditMode('adset'); setSelectedAdId(''); }}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-colors border-2 ${
                            editMode === 'adset'
                                ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                    >
                        Edit Ad Set
                    </button>
                    <button
                        onClick={() => setEditMode('ad')}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-colors border-2 ${
                            editMode === 'ad'
                                ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                        }`}
                    >
                        Edit Ad
                    </button>
                </div>

                {/* Selection Area */}
                <div className={`grid grid-cols-1 ${editMode === 'ad' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Select Campaign</label>
                        <select
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-orange-500"
                            disabled={isLoadingCampaigns}
                        >
                            <option value="">-- Select Campaign --</option>
                            {campaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {isLoadingCampaigns && <p className="text-xs text-orange-400 animate-pulse">Loading...</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Select Ad Set</label>
                        <select
                            value={selectedAdSetId}
                            onChange={(e) => setSelectedAdSetId(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-orange-500"
                            disabled={!selectedCampaignId || isLoadingAdSets}
                        >
                            <option value="">-- Select Ad Set --</option>
                            {adSets.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        {isLoadingAdSets && <p className="text-xs text-orange-400 animate-pulse">Loading...</p>}
                    </div>

                    {editMode === 'ad' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Select Ad</label>
                            <select
                                value={selectedAdId}
                                onChange={(e) => setSelectedAdId(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 outline-none focus:border-orange-500"
                                disabled={!selectedAdSetId || isLoadingAds}
                            >
                                <option value="">-- Select Ad --</option>
                                {ads.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                            {isLoadingAds && <p className="text-xs text-orange-400 animate-pulse">Loading...</p>}
                        </div>
                    )}
                </div>

                {/* Ad Set Edit Form */}
                {editMode === 'adset' && selectedAdSetId && (
                    <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Edit Ad Set Targeting</h2>
                                <p className="text-sm text-gray-400">Current values are pre-filled below</p>
                            </div>
                            {isLoadingCurrentData && (
                                <div className="flex items-center gap-2 text-orange-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">Loading current settings...</span>
                                </div>
                            )}
                        </div>

                        {/* Location Search */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Add/Replace Locations</label>
                            <div className="relative">
                                <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-orange-500">
                                    <Search className="w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={locationSearch}
                                        onChange={(e) => setLocationSearch(e.target.value)}
                                        onFocus={() => locationResults.length > 0 && setShowLocationDropdown(true)}
                                        placeholder="Search for a location..."
                                        className="flex-1 bg-transparent outline-none text-sm"
                                    />
                                    {isSearchingLocations && <Loader2 className="w-4 h-4 animate-spin text-orange-400" />}
                                </div>

                                {showLocationDropdown && locationResults.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                        {locationResults.map((loc) => (
                                            <button
                                                key={`${loc.type}-${loc.key}`}
                                                onClick={() => addLocation(loc)}
                                                className="w-full px-3 py-2 text-left hover:bg-gray-800 flex items-center gap-2 text-sm"
                                            >
                                                <MapPin className="w-4 h-4 text-gray-500" />
                                                <span>{loc.display_name}</span>
                                                <span className="text-gray-500 text-xs capitalize">({loc.type})</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedLocations.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedLocations.map((loc) => (
                                        <div
                                            key={`${loc.type}-${loc.key}`}
                                            className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/30 rounded-full px-3 py-1 text-sm"
                                        >
                                            <MapPin className="w-3 h-3 text-orange-400" />
                                            <span className="text-orange-200">{loc.display_name}</span>
                                            <button onClick={() => removeLocation(loc.key, loc.type)} className="ml-1 text-orange-400 hover:text-red-400">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-gray-500">Adding locations will replace existing targeting</p>
                        </div>

                        {/* Age Range */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Age Range: {ageMin} - {ageMax}+</label>
                            <div className="flex gap-4 items-center">
                                <input
                                    type="range" min="18" max="65"
                                    value={ageMin}
                                    onChange={(e) => setAgeMin(parseInt(e.target.value))}
                                    className="w-full accent-orange-500"
                                />
                                <input
                                    type="range" min="18" max="65"
                                    value={ageMax}
                                    onChange={(e) => setAgeMax(parseInt(e.target.value))}
                                    className="w-full accent-orange-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-800">
                            <button
                                onClick={handleSubmitAdSet}
                                disabled={isSubmitting}
                                className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}

                {/* Ad Edit Form */}
                {editMode === 'ad' && selectedAdId && (
                    <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Edit Ad Creative</h2>
                                <p className="text-sm text-gray-400">Current values are pre-filled below</p>
                            </div>
                            {isLoadingCurrentData && (
                                <div className="flex items-center gap-2 text-orange-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">Loading current creative...</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                {/* File Upload */}
                                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-orange-500 relative">
                                    <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    {adCreative.file ? (
                                        <p className="text-orange-400 font-medium">{adCreative.file.name}</p>
                                    ) : (
                                        <p className="text-gray-400 text-sm">Upload New Image/Video (Optional)</p>
                                    )}
                                </div>

                                <input
                                    placeholder="Headline"
                                    value={adCreative.title}
                                    onChange={(e) => setAdCreative({ ...adCreative, title: e.target.value })}
                                    className="w-full bg-black border border-gray-700 rounded-lg p-3"
                                />

                                <textarea
                                    placeholder="Primary Text"
                                    value={adCreative.body}
                                    onChange={(e) => setAdCreative({ ...adCreative, body: e.target.value })}
                                    className="w-full bg-black border border-gray-700 rounded-lg p-3 h-24 resize-none"
                                />

                                <input
                                    placeholder="Website URL"
                                    value={adCreative.link}
                                    onChange={(e) => setAdCreative({ ...adCreative, link: e.target.value })}
                                    className="w-full bg-black border border-gray-700 rounded-lg p-3"
                                />

                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Change Lead Form (Optional)</label>
                                    <select
                                        value={adCreative.leadFormId}
                                        onChange={(e) => setAdCreative({ ...adCreative, leadFormId: e.target.value })}
                                        className="w-full bg-black border border-gray-700 rounded-lg p-3"
                                        disabled={isLoadingForms}
                                    >
                                        <option value="">-- Keep Current / No Form --</option>
                                        {leadForms.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <select
                                    value={adCreative.cta}
                                    onChange={(e) => setAdCreative({ ...adCreative, cta: e.target.value })}
                                    className="w-full bg-black border border-gray-700 rounded-lg p-3"
                                >
                                    <option value="LEARN_MORE">Learn More (Default)</option>
                                    <option value="SHOP_NOW">Shop Now</option>
                                    <option value="SIGN_UP">Sign Up</option>
                                    <option value="GET_OFFER">Get Offer</option>
                                    <option value="APPLY_NOW">Apply Now</option>
                                </select>
                            </div>

                            {/* Preview */}
                            <div className="bg-white rounded-lg overflow-hidden h-fit text-black shadow-lg">
                                <div className="bg-gray-100 p-2 text-xs font-bold text-gray-500 border-b">Preview</div>
                                <div className="p-3">
                                    <p className="text-sm mb-2">{adCreative.body || "(Current text)"}</p>
                                    <div className="bg-gray-200 aspect-video w-full flex items-center justify-center mb-2">
                                        {adCreative.previewUrl ? (
                                            adCreative.file?.type.startsWith('video') ? (
                                                <video src={adCreative.previewUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={adCreative.previewUrl} alt="preview" className="w-full h-full object-cover" />
                                            )
                                        ) : "(Current media)"}
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                                        <p className="font-bold truncate">{adCreative.title || "(Current headline)"}</p>
                                        <button className="bg-gray-300 px-3 py-1 rounded text-xs font-bold">
                                            {adCreative.cta.replace('_', ' ')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-800">
                            <button
                                onClick={handleSubmitAd}
                                disabled={isSubmitting}
                                className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}

                {/* Messages */}
                {error && (
                    <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-center">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-4 bg-green-900/50 border border-green-500/50 rounded-lg text-green-200 text-center">
                        {success}
                    </div>
                )}
            </div>
        </div>
    );
}
