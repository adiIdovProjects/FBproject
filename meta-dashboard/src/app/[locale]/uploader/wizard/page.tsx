
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, CheckCircle, Target, Users,
    Upload, Loader2, DollarSign, MousePointer, X, Search, MapPin
} from 'lucide-react';
import { mutationsService, SmartCampaignRequest, GeoLocation } from '@/services/mutations.service';
import { useAccount } from '@/context/AccountContext';

export default function NewCampaignWizard() {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;
    const { selectedAccountId, linkedAccounts } = useAccount();
    const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLeadTypeModal, setShowLeadTypeModal] = useState(false);

    // Form State
    const [goal, setGoal] = useState<'SALES' | 'LEADS' | 'TRAFFIC' | 'ENGAGEMENT' | null>(null);
    const [leadType, setLeadType] = useState<'WEBSITE' | 'FORM' | null>(null);

    const [targeting, setTargeting] = useState({
        ageMin: 18,
        ageMax: 65,
        budget: 20
    });

    // Location targeting state
    const [selectedLocations, setSelectedLocations] = useState<GeoLocation[]>([]);
    const [locationSearch, setLocationSearch] = useState('');
    const [locationResults, setLocationResults] = useState<GeoLocation[]>([]);
    const [isSearchingLocations, setIsSearchingLocations] = useState(false);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);

    const [creative, setCreative] = useState({
        title: '',
        body: '',
        cta: 'LEARN_MORE',
        link: '',
        file: null as File | null,
        previewUrl: null as string | null,
        leadFormId: ''
    });

    // Pixel state for SALES objective
    const [pixels, setPixels] = useState<Array<{ id: string; name: string; code?: string }>>([]);
    const [selectedPixel, setSelectedPixel] = useState<string>('');
    const [isLoadingPixels, setIsLoadingPixels] = useState(false);

    // Lead forms state for LEADS objective
    const [leadForms, setLeadForms] = useState<Array<{ id: string; name: string }>>([]);
    const [isLoadingForms, setIsLoadingForms] = useState(false);

    // Load pixels when SALES objective is selected
    useEffect(() => {
        if (goal === 'SALES' && selectedAccount) {
            setIsLoadingPixels(true);
            mutationsService.getPixels(selectedAccount.account_id)
                .then((data) => {
                    setPixels(data);
                    // Auto-select first pixel if available
                    if (data.length > 0) {
                        setSelectedPixel(data[0].id);
                    }
                })
                .catch((err) => {
                    console.error('Failed to load pixels:', err);
                    setPixels([]);
                })
                .finally(() => setIsLoadingPixels(false));
        } else {
            // Reset pixel selection when switching away from SALES
            setPixels([]);
            setSelectedPixel('');
        }
    }, [goal, selectedAccount]);

    // Load lead forms when account has page_id
    useEffect(() => {
        if (selectedAccount?.page_id && selectedAccount?.account_id) {
            setIsLoadingForms(true);
            mutationsService.getLeadForms(selectedAccount.page_id, selectedAccount.account_id)
                .then((forms) => {
                    setLeadForms(forms);
                    // Auto-select first form if available and LEADS+FORM is selected
                    if (forms.length > 0 && goal === 'LEADS' && leadType === 'FORM' && !creative.leadFormId) {
                        setCreative(prev => ({ ...prev, leadFormId: forms[0].id }));
                    }
                })
                .catch((err) => {
                    console.error('Failed to load lead forms:', err);
                    setLeadForms([]);
                })
                .finally(() => setIsLoadingForms(false));
        }
    }, [selectedAccount?.page_id, selectedAccount?.account_id]);

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
                // Filter out already selected locations
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

    const addLocation = (location: GeoLocation) => {
        setSelectedLocations(prev => [...prev, location]);
        setLocationSearch('');
        setLocationResults([]);
        setShowLocationDropdown(false);
    };

    const removeLocation = (key: string, type: string) => {
        setSelectedLocations(prev => prev.filter(l => !(l.key === key && l.type === type)));
    };

    // Handle goal selection
    const handleGoalSelect = (selectedGoal: 'SALES' | 'LEADS' | 'TRAFFIC' | 'ENGAGEMENT') => {
        if (selectedGoal === 'LEADS') {
            setGoal('LEADS');
            setShowLeadTypeModal(true);
        } else {
            setGoal(selectedGoal);
            setLeadType(null);
            setShowLeadTypeModal(false);
        }
    };

    const handleLeadTypeSelect = (type: 'WEBSITE' | 'FORM') => {
        setLeadType(type);
        setShowLeadTypeModal(false);
    };

    const handleSubmit = async () => {
        if (!selectedAccount) {
            setError("Please select an ad account first");
            return;
        }

        // Validate page_id exists
        if (!selectedAccount.page_id) {
            setError("No Facebook Page connected to this account. Please reconnect your account in Settings.");
            return;
        }

        // Validate pixel for SALES objective
        if (goal === 'SALES' && !selectedPixel) {
            setError("Please select a Facebook Pixel for the SALES objective");
            return;
        }

        // Validate lead form for LEADS+FORM objective
        if (goal === 'LEADS' && leadType === 'FORM' && !creative.leadFormId) {
            setError("Please select a lead form for the instant form lead objective");
            return;
        }

        // Frontend Validation
        if (!creative.file) {
            setError("Please upload an image or video");
            return;
        }

        if (!creative.title || creative.title.trim().length === 0) {
            setError("Please enter a headline");
            return;
        }

        if (!creative.body || creative.body.trim().length === 0) {
            setError("Please enter primary text");
            return;
        }

        // File size validation
        const maxImageSize = 30 * 1024 * 1024; // 30MB
        const maxVideoSize = 4 * 1024 * 1024 * 1024; // 4GB
        const isVideo = creative.file.type.startsWith('video/');

        if (!isVideo && creative.file.size > maxImageSize) {
            setError("Image must be under 30MB");
            return;
        }

        if (isVideo && creative.file.size > maxVideoSize) {
            setError("Video must be under 4GB");
            return;
        }

        // File format validation
        const validImageFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        const validVideoFormats = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

        if (!isVideo && !validImageFormats.includes(creative.file.type)) {
            setError("Image must be JPG, PNG, or GIF format");
            return;
        }

        if (isVideo && !validVideoFormats.includes(creative.file.type)) {
            setError("Video must be MP4 or MOV format");
            return;
        }

        // Budget validation
        if (targeting.budget < 1) {
            setError("Minimum daily budget is $1");
            return;
        }

        // URL validation (if not using lead form)
        if ((goal === 'TRAFFIC' || goal === 'ENGAGEMENT' || (goal === 'LEADS' && leadType === 'WEBSITE')) && creative.link) {
            try {
                const url = new URL(creative.link);
                if (url.protocol !== 'https:' && url.protocol !== 'http:') {
                    setError("Website URL must start with http:// or https://");
                    return;
                }
            } catch (e) {
                setError("Please enter a valid website URL");
                return;
            }
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Upload Media
            let imageHash = undefined;
            let videoId = undefined;

            if (creative.file) {
                const uploadRes = await mutationsService.uploadMedia(
                    selectedAccount.account_id,
                    creative.file,
                    isVideo
                );
                if (isVideo) videoId = uploadRes.video_id;
                else imageHash = uploadRes.image_hash;
            }

            // 2. Create Campaign
            const payload: SmartCampaignRequest = {
                account_id: selectedAccount.account_id,
                page_id: selectedAccount.page_id!,
                campaign_name: `Smart Campaign - ${goal} - ${new Date().toLocaleDateString()}`,
                objective: goal!,
                geo_locations: selectedLocations.map(loc => ({
                    key: loc.key,
                    type: loc.type,
                    name: loc.name,
                    country_code: loc.country_code
                })),
                age_min: targeting.ageMin,
                age_max: targeting.ageMax,
                daily_budget_cents: targeting.budget * 100,
                pixel_id: goal === 'SALES' ? selectedPixel : undefined,
                creative: {
                    title: creative.title,
                    body: creative.body,
                    call_to_action: creative.cta,
                    link_url: creative.link,
                    image_hash: imageHash,
                    video_id: videoId,
                    lead_form_id: (goal === 'LEADS' && leadType === 'FORM') ? creative.leadFormId : undefined
                }
            };

            const result = await mutationsService.createSmartCampaign(payload);

            // Success! Show brief confirmation before redirect
            console.log('Campaign created successfully:', result);

            // Optional: You could add a success toast here
            // toast.success(`Campaign created! ID: ${result.campaign_id}`);

            router.push('/campaigns');

        } catch (err: any) {
            console.error(err);
            setError(parseFbError(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Parse Facebook API errors to user-friendly messages
    const parseFbError = (err: any): string => {
        const msg = err.response?.data?.detail || err.message || '';

        // Facebook API error mapping
        const errorMap: { [key: string]: string } = {
            'Permission denied': "Your Facebook account doesn't have permission to create ads. Please reconnect with the correct permissions.",
            'Budget too low': "Minimum budget is $1/day for your target audience.",
            'Invalid pixel': "No conversion pixel found. Please set up Facebook Pixel first.",
            'Invalid access token': "Your Facebook session has expired. Please log in again.",
            'User request limit reached': "Too many requests. Please wait a moment and try again.",
            'Invalid creative': "There's an issue with your image or video. Please try a different file.",
            'Application request limit reached': "Service is temporarily busy. Please try again in a few minutes.",
            'Invalid page': "The selected Facebook page is invalid or you don't have access to it.",
            'Invalid lead form': "The lead form ID is invalid or no longer exists.",
        };

        // Check for matching error patterns
        for (const [pattern, friendlyMsg] of Object.entries(errorMap)) {
            if (msg.toLowerCase().includes(pattern.toLowerCase())) {
                return friendlyMsg;
            }
        }

        // Generic fallback
        return "Something went wrong while creating your campaign. Please try again or contact support if the issue persists.";
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCreative(prev => ({
                ...prev,
                file: file,
                previewUrl: URL.createObjectURL(file)
            }));
        }
    };

    // Render Goal Selection Section
    const renderGoalSection = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-200">1. What is your goal?</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* SALES */}
                <div
                    onClick={() => handleGoalSelect('SALES')}
                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${goal === 'SALES' ? 'border-green-500 bg-green-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'}`}
                >
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className={`p-3 rounded-full ${goal === 'SALES' ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-300'}`}>
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">Sales</h3>
                            <p className="text-xs text-gray-400">Drive purchases</p>
                        </div>
                    </div>
                </div>

                {/* LEADS */}
                <div
                    onClick={() => handleGoalSelect('LEADS')}
                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${goal === 'LEADS' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'}`}
                >
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className={`p-3 rounded-full ${goal === 'LEADS' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">Leads</h3>
                            <p className="text-xs text-gray-400">Collect signups</p>
                            {goal === 'LEADS' && leadType && (
                                <p className="text-xs text-blue-400 mt-1">({leadType === 'FORM' ? 'Instant Form' : 'Website'})</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* TRAFFIC */}
                <div
                    onClick={() => handleGoalSelect('TRAFFIC')}
                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${goal === 'TRAFFIC' ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'}`}
                >
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className={`p-3 rounded-full ${goal === 'TRAFFIC' ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">Traffic</h3>
                            <p className="text-xs text-gray-400">Website visits</p>
                        </div>
                    </div>
                </div>

                {/* ENGAGEMENT */}
                <div
                    onClick={() => handleGoalSelect('ENGAGEMENT')}
                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${goal === 'ENGAGEMENT' ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'}`}
                >
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className={`p-3 rounded-full ${goal === 'ENGAGEMENT' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                            <MousePointer className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">Engagement</h3>
                            <p className="text-xs text-gray-400">Likes & comments</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Lead Type Modal
    const renderLeadTypeModal = () => (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Where do you want to collect leads?</h3>
                    <button
                        onClick={() => { setShowLeadTypeModal(false); setGoal(null); }}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => handleLeadTypeSelect('FORM')}
                        className="w-full p-4 rounded-xl border-2 border-gray-700 hover:border-blue-500 hover:bg-blue-500/10 transition-all text-left"
                    >
                        <div className="font-bold mb-1">On Facebook (Instant Form)</div>
                        <p className="text-sm text-gray-400">Collect leads directly on Facebook without leaving the app</p>
                    </button>

                    <button
                        onClick={() => handleLeadTypeSelect('WEBSITE')}
                        className="w-full p-4 rounded-xl border-2 border-gray-700 hover:border-blue-500 hover:bg-blue-500/10 transition-all text-left"
                    >
                        <div className="font-bold mb-1">On My Website</div>
                        <p className="text-sm text-gray-400">Send people to your website landing page</p>
                    </button>
                </div>
            </div>
        </div>
    );

    // Render Targeting Section
    const renderTargetingSection = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-200">2. Targeting & Budget</h2>

            {/* Location Search - Full Width */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Location (Country, City, or Region)</label>
                <div className="relative">
                    <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                        <Search className="w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={locationSearch}
                            onChange={(e) => setLocationSearch(e.target.value)}
                            onFocus={() => locationResults.length > 0 && setShowLocationDropdown(true)}
                            placeholder="Search for a location..."
                            className="flex-1 bg-transparent outline-none text-sm"
                        />
                        {isSearchingLocations && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                    </div>

                    {/* Dropdown Results */}
                    {showLocationDropdown && locationResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
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

                {/* Selected Locations */}
                {selectedLocations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {selectedLocations.map((loc) => (
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
                    </div>
                )}

                {selectedLocations.length === 0 && (
                    <p className="text-xs text-gray-500">Add at least one location to target</p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Age */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Age: {targeting.ageMin} - {targeting.ageMax}+</label>
                    <div className="flex gap-2 items-center">
                        <input
                            type="range" min="18" max="65"
                            value={targeting.ageMin}
                            onChange={(e) => setTargeting({ ...targeting, ageMin: parseInt(e.target.value) })}
                            className="w-full accent-blue-500"
                        />
                        <input
                            type="range" min="18" max="65"
                            value={targeting.ageMax}
                            onChange={(e) => setTargeting({ ...targeting, ageMax: parseInt(e.target.value) })}
                            className="w-full accent-blue-500"
                        />
                    </div>
                </div>

                {/* Budget */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Daily Budget</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                            type="number"
                            value={targeting.budget}
                            onChange={(e) => setTargeting({ ...targeting, budget: parseInt(e.target.value) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-7 pr-3 py-2 font-bold focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Pixel Selection (SALES only) */}
            {goal === 'SALES' && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Facebook Pixel <span className="text-red-400">*</span>
                    </label>
                    {isLoadingPixels ? (
                        <div className="flex items-center gap-2 text-sm text-blue-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading pixels...
                        </div>
                    ) : pixels.length > 0 ? (
                        <select
                            value={selectedPixel}
                            onChange={(e) => setSelectedPixel(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                            required
                        >
                            {pixels.map((pixel) => (
                                <option key={pixel.id} value={pixel.id}>
                                    {pixel.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <p className="text-sm text-red-400">⚠️ No pixels found. <a href="https://www.youtube.com/watch?v=pQU7jXHsbYo" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Watch tutorial</a></p>
                    )}
                </div>
            )}
        </div>
    );

    // Render Creative Section
    const renderCreativeSection = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-200">3. Create Your Ad</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inputs */}
                <div className="space-y-4">
                    {/* File Upload */}
                    <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center hover:border-blue-500 transition-colors relative">
                        <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center gap-2 pointer-events-none">
                            {creative.file ? (
                                <>
                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                    <p className="font-medium text-green-400 text-sm">{creative.file.name}</p>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-gray-500" />
                                    <p className="text-gray-400 text-sm">Upload image/video</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Text Inputs */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs uppercase text-gray-500 font-bold">Primary Text</label>
                            <textarea
                                value={creative.body}
                                onChange={(e) => setCreative({ ...creative, body: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 h-20 focus:border-blue-500 outline-none resize-none text-sm"
                                placeholder="The main text above the image..."
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-gray-500 font-bold">Headline</label>
                            <input
                                value={creative.title}
                                onChange={(e) => setCreative({ ...creative, title: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:border-blue-500 outline-none text-sm"
                                placeholder="Short, catchy headline"
                            />
                        </div>

                        {/* Conditional Fields */}
                        {leadType === 'WEBSITE' || goal !== 'LEADS' ? (
                            <div>
                                <label className="text-xs uppercase text-gray-500 font-bold">Website URL</label>
                                <input
                                    value={creative.link}
                                    onChange={(e) => setCreative({ ...creative, link: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:border-blue-500 outline-none text-sm"
                                    placeholder="https://yourwebsite.com"
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="text-xs uppercase text-gray-500 font-bold text-blue-400">
                                    Instant Form <span className="text-red-400">*</span>
                                </label>
                                {isLoadingForms ? (
                                    <div className="flex items-center gap-2 text-sm text-blue-400 py-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Loading forms...
                                    </div>
                                ) : leadForms.length > 0 ? (
                                    <select
                                        value={creative.leadFormId}
                                        onChange={(e) => setCreative({ ...creative, leadFormId: e.target.value })}
                                        className="w-full bg-gray-900 border border-blue-500/30 rounded-lg p-3 focus:border-blue-500 outline-none text-sm"
                                        required
                                    >
                                        <option value="">-- Select Form --</option>
                                        {leadForms.map((form) => (
                                            <option key={form.id} value={form.id}>{form.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-sm text-yellow-400 py-2">⚠️ No forms found. <a href="https://www.youtube.com/watch?v=iQ9rRnKtrxY" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Watch tutorial</a></p>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="text-xs uppercase text-gray-500 font-bold">Call To Action</label>
                            <select
                                value={creative.cta}
                                onChange={(e) => setCreative({ ...creative, cta: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:border-blue-500 outline-none text-sm"
                            >
                                <option value="LEARN_MORE">Learn More</option>
                                <option value="SHOP_NOW">Shop Now</option>
                                <option value="SIGN_UP">Sign Up</option>
                                <option value="GET_OFFER">Get Offer</option>
                                <option value="APPLY_NOW">Apply Now</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div className="bg-white rounded-xl overflow-hidden shadow-xl h-fit border border-gray-800">
                    <div className="bg-gray-100 p-2 border-b flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-300 rounded-full" />
                        <div className="h-2 w-20 bg-gray-300 rounded" />
                    </div>
                    <div className="p-3">
                        <p className="text-xs text-gray-800 whitespace-pre-wrap">
                            {creative.body || "Your ad text here..."}
                        </p>
                    </div>

                    <div className="bg-gray-200 aspect-video w-full flex items-center justify-center overflow-hidden">
                        {creative.previewUrl ? (
                            creative.file?.type.startsWith('video') ? (
                                <video src={creative.previewUrl} className="w-full h-full object-cover" />
                            ) : (
                                <img src={creative.previewUrl} className="w-full h-full object-cover" />
                            )
                        ) : (
                            <p className="text-gray-400 text-sm">Preview</p>
                        )}
                    </div>

                    <div className="bg-gray-100 p-2 flex justify-between items-center border-t border-gray-200">
                        <div className="flex-1 min-w-0 pr-2">
                            <p className="text-[10px] text-gray-500 uppercase truncate">
                                {goal === 'LEADS' && leadType === 'FORM' ? 'FACEBOOK' : 'WEBSITE'}
                            </p>
                            <h4 className="font-bold text-gray-900 truncate text-sm">
                                {creative.title || "Headline"}
                            </h4>
                        </div>
                        <button className="bg-gray-300 px-3 py-1 rounded text-xs font-semibold text-gray-700">
                            {creative.cta.replace('_', ' ')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Check if form is ready to submit
    const canSubmit = goal &&
        (goal !== 'LEADS' || leadType) &&
        selectedLocations.length > 0 &&
        creative.file &&
        creative.title &&
        (goal !== 'SALES' || selectedPixel) &&
        (goal !== 'LEADS' || leadType !== 'FORM' || creative.leadFormId);

    return (
        <div className="min-h-screen bg-black text-white p-6">
            {/* Lead Type Modal */}
            {showLeadTypeModal && renderLeadTypeModal()}

            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push(`/${locale}/uploader`)}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold">Create New Campaign</h1>
                    </div>
                    <a href={`/${locale}/uploader/add-creative`} className="text-sm text-blue-400 hover:text-blue-300">
                        Add to existing campaign →
                    </a>
                </div>

                {/* Page ID Warning */}
                {!selectedAccount?.page_id && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <div className="flex-1">
                                <span className="text-yellow-400 font-medium">Facebook Page not connected.</span>
                                <button
                                    onClick={() => router.push(`/${locale}/settings?tab=accounts`)}
                                    className="ml-2 text-blue-400 underline text-sm"
                                >
                                    Reconnect in Settings
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* All Sections */}
                <div className="space-y-8">
                    {renderGoalSection()}
                    {renderTargetingSection()}
                    {renderCreativeSection()}
                </div>

                {/* Submit Button */}
                <div className="mt-8 pt-6 border-t border-gray-800">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-400">
                            {!goal && "Select a goal to continue"}
                            {goal === 'LEADS' && !leadType && "Select where to collect leads"}
                            {goal && (goal !== 'LEADS' || leadType) && !creative.file && "Upload an image or video"}
                            {goal && (goal !== 'LEADS' || leadType) && creative.file && !creative.title && "Add a headline"}
                            {canSubmit && "Ready to launch!"}
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSubmitting}
                            className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            Launch Campaign
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-center">
                            ⚠️ {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
