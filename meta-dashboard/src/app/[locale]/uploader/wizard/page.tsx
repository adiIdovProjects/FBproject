
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, CheckCircle, Target, Users,
    Upload, Loader2, DollarSign, MousePointer, X, Search, MapPin, Lightbulb
} from 'lucide-react';
import { mutationsService, SmartCampaignRequest, GeoLocation, CustomAudience, Interest, InterestTarget } from '@/services/mutations.service';
import { useAccount } from '@/context/AccountContext';
import { useTranslations } from 'next-intl';

// Inline Tip component
const Tip = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300 mt-3">
        <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
        <span>{children}</span>
    </div>
);

// Step indicator component
const StepIndicator = ({ currentStep, stepText }: { currentStep: number; stepText: string }) => (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
        <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
                <div
                    key={s}
                    className={`w-10 h-1.5 rounded-full transition-colors ${currentStep >= s ? 'bg-accent' : 'bg-gray-700'}`}
                />
            ))}
        </div>
        <span className="text-sm text-gray-400">{stepText}</span>
    </div>
);

// Quality check item component
const QualityCheck = ({ passed, label, hint }: { passed: boolean; label: string; hint?: string }) => (
    <div className="flex items-center gap-2 text-xs">
        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passed ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
            {passed ? <CheckCircle className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
        </div>
        <span className={passed ? 'text-green-400' : 'text-gray-500'}>{label}</span>
        {hint && <span className="text-gray-600 ml-auto">{hint}</span>}
    </div>
);

export default function NewCampaignWizard() {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;
    const t = useTranslations();
    const isRTL = locale === 'he' || locale === 'ar';
    const { selectedAccountId, linkedAccounts, isLoading: isAccountLoading } = useAccount();
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

    // Pixel state for SALES and LEADS (website) objectives
    const [pixels, setPixels] = useState<Array<{ id: string; name: string; code?: string }>>([]);
    const [selectedPixel, setSelectedPixel] = useState<string>('');
    const [selectedConversionEvent, setSelectedConversionEvent] = useState<string>('');
    const [isLoadingPixels, setIsLoadingPixels] = useState(false);

    // Lead forms state for LEADS objective
    const [leadForms, setLeadForms] = useState<Array<{ id: string; name: string }>>([]);
    const [isLoadingForms, setIsLoadingForms] = useState(false);

    // Custom naming state
    const [customNames, setCustomNames] = useState({
        campaignName: '',
        adsetName: '',
        adName: ''
    });

    // Preview format state
    const [previewFormat, setPreviewFormat] = useState<'feed' | 'story'>('feed');

    // Audience targeting mode: advantage_plus (Facebook AI) or custom (user selected)
    const [audienceMode, setAudienceMode] = useState<'advantage_plus' | 'custom'>('advantage_plus');
    const [customAudiences, setCustomAudiences] = useState<CustomAudience[]>([]);
    const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
    const [excludedAudiences, setExcludedAudiences] = useState<string[]>([]);
    const [isLoadingAudiences, setIsLoadingAudiences] = useState(false);

    // Interest targeting
    const [interestSearch, setInterestSearch] = useState('');
    const [interestResults, setInterestResults] = useState<Interest[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<InterestTarget[]>([]);
    const [showInterestDropdown, setShowInterestDropdown] = useState(false);
    const [isSearchingInterests, setIsSearchingInterests] = useState(false);

    // Load pixels when SALES or LEADS+WEBSITE objective is selected
    const needsPixel = goal === 'SALES' || (goal === 'LEADS' && leadType === 'WEBSITE');

    useEffect(() => {
        if (needsPixel && selectedAccount) {
            setIsLoadingPixels(true);
            mutationsService.getPixels(selectedAccount.account_id)
                .then((data) => {
                    setPixels(data);
                    // Auto-select first pixel if available
                    if (data.length > 0) {
                        setSelectedPixel(data[0].id);
                        // Set default conversion event based on objective
                        setSelectedConversionEvent(goal === 'SALES' ? 'PURCHASE' : 'LEAD');
                    }
                })
                .catch((err) => {
                    console.error('Failed to load pixels:', err);
                    setPixels([]);
                })
                .finally(() => setIsLoadingPixels(false));
        } else if (!needsPixel) {
            // Reset pixel selection when not needed
            setPixels([]);
            setSelectedPixel('');
            setSelectedConversionEvent('');
        }
    }, [needsPixel, selectedAccount, goal]);

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

    // Load custom audiences when mode is "custom"
    useEffect(() => {
        if (audienceMode === 'custom' && selectedAccount?.account_id) {
            setIsLoadingAudiences(true);
            mutationsService.getCustomAudiences(selectedAccount.account_id)
                .then((audiences) => {
                    setCustomAudiences(audiences);
                })
                .catch((err) => {
                    console.error('Failed to load custom audiences:', err);
                    setCustomAudiences([]);
                })
                .finally(() => setIsLoadingAudiences(false));
        }
    }, [audienceMode, selectedAccount?.account_id]);

    // Interest search with debounce
    useEffect(() => {
        if (interestSearch.length < 2) {
            setInterestResults([]);
            setShowInterestDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingInterests(true);
            try {
                const results = await mutationsService.searchInterests(interestSearch);
                // Filter out already selected interests
                const filtered = results.filter(
                    r => !selectedInterests.some(s => s.id === r.id)
                );
                setInterestResults(filtered);
                setShowInterestDropdown(true);
            } catch (err) {
                console.error('Interest search failed:', err);
                setInterestResults([]);
            } finally {
                setIsSearchingInterests(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [interestSearch, selectedInterests]);

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

        // Validate pixel for SALES or LEADS+WEBSITE objective
        if ((goal === 'SALES' || (goal === 'LEADS' && leadType === 'WEBSITE')) && !selectedPixel) {
            setError("Please select a Facebook Pixel to track conversions");
            return;
        }

        // Validate conversion event when pixel is required
        if ((goal === 'SALES' || (goal === 'LEADS' && leadType === 'WEBSITE')) && !selectedConversionEvent) {
            setError("Please select a conversion event");
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
            const defaultCampaignName = `Smart Campaign - ${goal} - ${new Date().toISOString().split('T')[0]}`;
            const payload: SmartCampaignRequest = {
                account_id: selectedAccount.account_id,
                page_id: selectedAccount.page_id!,
                campaign_name: customNames.campaignName || defaultCampaignName,
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
                pixel_id: needsPixel ? selectedPixel : undefined,
                conversion_event: needsPixel ? selectedConversionEvent : undefined,
                creative: {
                    title: creative.title,
                    body: creative.body,
                    call_to_action: creative.cta,
                    link_url: creative.link,
                    image_hash: imageHash,
                    video_id: videoId,
                    lead_form_id: (goal === 'LEADS' && leadType === 'FORM') ? creative.leadFormId : undefined
                },
                adset_name: customNames.adsetName || undefined,
                ad_name: customNames.adName || undefined,
                custom_audiences: selectedAudiences.length > 0 ? selectedAudiences : undefined,
                excluded_audiences: excludedAudiences.length > 0 ? excludedAudiences : undefined,
                interests: selectedInterests.length > 0 ? selectedInterests : undefined
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
            <StepIndicator currentStep={1} stepText={t('wizard.step_of', { current: 1, total: 3 })} />
            <h2 className="text-xl font-bold text-gray-200">{t('wizard.step_1_title')}</h2>

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
                            <h3 className="font-bold">{t('wizard.sales')}</h3>
                            <p className="text-xs text-gray-400">{t('wizard.sales_desc')}</p>
                            <p className="text-[10px] text-gray-500 mt-1">{t('wizard.objective_sales')}</p>
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
                            <h3 className="font-bold">{t('wizard.leads')}</h3>
                            <p className="text-xs text-gray-400">{t('wizard.leads_desc')}</p>
                            <p className="text-[10px] text-gray-500 mt-1">{t('wizard.objective_leads')}</p>
                            {goal === 'LEADS' && leadType && (
                                <p className="text-xs text-blue-400 mt-1">({leadType === 'FORM' ? t('wizard.instant_form') : t('wizard.website')})</p>
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
                            <h3 className="font-bold">{t('wizard.traffic')}</h3>
                            <p className="text-xs text-gray-400">{t('wizard.traffic_desc')}</p>
                            <p className="text-[10px] text-gray-500 mt-1">{t('wizard.objective_traffic')}</p>
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
                            <h3 className="font-bold">{t('wizard.engagement')}</h3>
                            <p className="text-xs text-gray-400">{t('wizard.engagement_desc')}</p>
                            <p className="text-[10px] text-gray-500 mt-1">{t('wizard.objective_engagement')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Campaign Name */}
            <div className="mt-4 space-y-2">
                <label className="text-sm font-medium text-gray-400">{t('wizard.campaign_name_optional')}</label>
                <input
                    type="text"
                    value={customNames.campaignName}
                    onChange={(e) => setCustomNames({ ...customNames, campaignName: e.target.value })}
                    placeholder={`${t('wizard.campaign_placeholder')} - ${goal || 'GOAL'} - ${new Date().toISOString().split('T')[0]}`}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
        </div>
    );

    // Lead Type Modal
    const renderLeadTypeModal = () => (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">{t('wizard.lead_type_title')}</h3>
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
                        <div className="font-bold mb-1">{t('wizard.lead_type_form')}</div>
                        <p className="text-sm text-gray-400">{t('wizard.lead_type_form_desc')}</p>
                    </button>

                    <button
                        onClick={() => handleLeadTypeSelect('WEBSITE')}
                        className="w-full p-4 rounded-xl border-2 border-gray-700 hover:border-blue-500 hover:bg-blue-500/10 transition-all text-left"
                    >
                        <div className="font-bold mb-1">{t('wizard.lead_type_website')}</div>
                        <p className="text-sm text-gray-400">{t('wizard.lead_type_website_desc')}</p>
                    </button>
                </div>
            </div>
        </div>
    );

    // Render Targeting Section
    const renderTargetingSection = () => (
        <div className="space-y-4">
            <StepIndicator currentStep={2} stepText={t('wizard.step_of', { current: 2, total: 3 })} />
            <h2 className="text-xl font-bold text-gray-200">{t('wizard.step_2_title')}</h2>

            {/* Ad Set Name - Above Location */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">{t('wizard.adset_name_optional')}</label>
                <input
                    type="text"
                    value={customNames.adsetName}
                    onChange={(e) => setCustomNames({ ...customNames, adsetName: e.target.value })}
                    placeholder={`${t('wizard.adset_placeholder')} 12345`}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {/* Location Search - Now above Audience Targeting */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">{t('wizard.location')}</label>
                <div className="relative">
                    <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
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
                    <p className="text-xs text-gray-500">{t('wizard.add_location_hint')}</p>
                )}
            </div>

            {/* Audience Mode Toggle */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-gray-400">{t('wizard.audience_targeting')}</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => { setAudienceMode('advantage_plus'); setSelectedAudiences([]); setExcludedAudiences([]); setSelectedInterests([]); }}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${audienceMode === 'advantage_plus'
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">✨</span>
                            <span className="font-bold text-white text-sm">{t('wizard.advantage_plus')}</span>
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">{t('wizard.recommended')}</span>
                        </div>
                        <p className="text-xs text-gray-400">{t('wizard.advantage_plus_desc')}</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setAudienceMode('custom')}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${audienceMode === 'custom'
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🎯</span>
                            <span className="font-bold text-white text-sm">{t('wizard.custom_audience')}</span>
                        </div>
                        <p className="text-xs text-gray-400">{t('wizard.custom_audience_desc')}</p>
                    </button>
                </div>

                {/* Custom Audiences Dropdown (only shown when mode is "custom") */}
                {audienceMode === 'custom' && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                            {t('wizard.select_audiences')}
                        </label>
                        {isLoadingAudiences ? (
                            <div className="flex items-center gap-2 text-sm text-blue-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('wizard.loading_audiences')}
                            </div>
                        ) : customAudiences.length > 0 ? (
                            <>
                                {/* Include Audiences */}
                                <div className="space-y-2 max-h-36 overflow-y-auto">
                                    {customAudiences.filter(a => !excludedAudiences.includes(a.id)).map((audience) => (
                                        <label
                                            key={audience.id}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedAudiences.includes(audience.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedAudiences(prev => [...prev, audience.id]);
                                                    } else {
                                                        setSelectedAudiences(prev => prev.filter(id => id !== audience.id));
                                                    }
                                                }}
                                                className="w-4 h-4 accent-blue-500"
                                            />
                                            <div className="flex-1">
                                                <span className="text-sm text-white">{audience.name}</span>
                                                <span className="text-xs text-gray-500 ml-2">({audience.type_label})</span>
                                            </div>
                                            {audience.approximate_count && (
                                                <span className="text-xs text-gray-400">
                                                    ~{(audience.approximate_count / 1000).toFixed(0)}K
                                                </span>
                                            )}
                                        </label>
                                    ))}
                                </div>

                                {/* Exclude Audiences */}
                                <div className="mt-3 pt-3 border-t border-red-500/20">
                                    <label className="text-sm font-medium text-red-400 mb-2 block">
                                        {t('wizard.exclude_audiences')}
                                    </label>
                                    <div className="space-y-2 max-h-36 overflow-y-auto">
                                        {customAudiences.filter(a => !selectedAudiences.includes(a.id)).map((audience) => (
                                            <label
                                                key={audience.id}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-500/5 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={excludedAudiences.includes(audience.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setExcludedAudiences(prev => [...prev, audience.id]);
                                                        } else {
                                                            setExcludedAudiences(prev => prev.filter(id => id !== audience.id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 accent-red-500"
                                                />
                                                <div className="flex-1">
                                                    <span className="text-sm text-white">{audience.name}</span>
                                                    <span className="text-xs text-gray-500 ml-2">({audience.type_label})</span>
                                                </div>
                                                {audience.approximate_count && (
                                                    <span className="text-xs text-gray-400">
                                                        ~{(audience.approximate_count / 1000).toFixed(0)}K
                                                    </span>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-yellow-400">{t('wizard.no_audiences')}</p>
                        )}

                        {/* Interest Targeting - Inside Custom Audience section */}
                        <div className="mt-4 pt-4 border-t border-blue-500/20">
                            <label className="text-sm font-medium text-gray-300 mb-1 block">{t('wizard.interest_targeting')}</label>
                            <p className="text-xs text-gray-500 mb-2">{t('wizard.interest_hint')}</p>
                            <div className="relative">
                                <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-purple-500">
                                    <Search className="w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={interestSearch}
                                        onChange={(e) => setInterestSearch(e.target.value)}
                                        onFocus={() => interestResults.length > 0 && setShowInterestDropdown(true)}
                                        placeholder={t('wizard.interest_placeholder')}
                                        className="flex-1 bg-transparent outline-none text-sm"
                                    />
                                    {isSearchingInterests && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
                                </div>

                                {/* Interest Dropdown Results */}
                                {showInterestDropdown && interestResults.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {interestResults.map((interest) => (
                                            <button
                                                key={interest.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedInterests(prev => [...prev, { id: interest.id, name: interest.name }]);
                                                    setInterestSearch('');
                                                    setShowInterestDropdown(false);
                                                }}
                                                className="w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center gap-2"
                                            >
                                                <span className="text-purple-400">🎯</span>
                                                <div className="flex-1">
                                                    <span className="text-sm text-white">{interest.name}</span>
                                                    {interest.path && interest.path.length > 0 && (
                                                        <span className="text-xs text-gray-500 ml-2">
                                                            {interest.path.join(' > ')}
                                                        </span>
                                                    )}
                                                </div>
                                                {(interest.audience_size_lower_bound || interest.audience_size_upper_bound) && (
                                                    <span className="text-xs text-gray-400">
                                                        ~{((interest.audience_size_lower_bound + interest.audience_size_upper_bound) / 2000000).toFixed(1)}M
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected Interests */}
                            {selectedInterests.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedInterests.map((interest) => (
                                        <span
                                            key={interest.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                                        >
                                            🎯 {interest.name}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedInterests(prev => prev.filter(i => i.id !== interest.id))}
                                                className="hover:text-purple-100"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Age */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">{t('wizard.age')}: {targeting.ageMin} - {targeting.ageMax}+</label>
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
                    <label className="text-sm font-medium text-gray-400">{t('wizard.daily_budget')}</label>
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

            <Tip>{t('tips.budget_testing')}</Tip>

            {/* Pixel Selection (SALES or LEADS+WEBSITE) */}
            {needsPixel && (
                <div className={`p-4 rounded-xl ${goal === 'SALES' ? 'bg-green-500/10 border border-green-500/30' : 'bg-blue-500/10 border border-blue-500/30'}`}>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                        {t('wizard.facebook_pixel')} <span className="text-red-400">*</span>
                    </label>
                    {isLoadingPixels ? (
                        <div className="flex items-center gap-2 text-sm text-blue-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('wizard.loading_pixels')}
                        </div>
                    ) : pixels.length > 0 ? (
                        <div className="space-y-3">
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

                            {/* Conversion Event Selection */}
                            <div>
                                <label className="text-sm font-medium text-gray-400 mb-1 block">
                                    {t('wizard.conversion_event')} <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={selectedConversionEvent}
                                    onChange={(e) => setSelectedConversionEvent(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                                    required
                                >
                                    {goal === 'SALES' ? (
                                        <>
                                            <option value="PURCHASE">{t('wizard.purchase')}</option>
                                            <option value="ADD_TO_CART">{t('wizard.add_to_cart')}</option>
                                            <option value="INITIATE_CHECKOUT">{t('wizard.initiate_checkout')}</option>
                                            <option value="ADD_PAYMENT_INFO">{t('wizard.add_payment_info')}</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="LEAD">{t('wizard.lead')}</option>
                                            <option value="COMPLETE_REGISTRATION">{t('wizard.complete_registration')}</option>
                                            <option value="CONTACT">{t('wizard.contact')}</option>
                                            <option value="SUBMIT_APPLICATION">{t('wizard.submit_application')}</option>
                                        </>
                                    )}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {goal === 'SALES'
                                        ? t('wizard.conversion_optimize_sales')
                                        : t('wizard.conversion_optimize_leads')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-red-400">⚠️ {t('wizard.no_pixels')} <a href={`/${locale}/learning`} className="text-blue-400 underline">{t('wizard.learn_setup')}</a></p>
                    )}
                </div>
            )}
        </div>
    );

    // Render Creative Section
    const renderCreativeSection = () => (
        <div className="space-y-4">
            <StepIndicator currentStep={3} stepText={t('wizard.step_of', { current: 3, total: 3 })} />
            <h2 className="text-xl font-bold text-gray-200">{t('wizard.step_3_title')}</h2>

            {/* Ad Name */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">{t('wizard.ad_name_optional')}</label>
                <input
                    type="text"
                    value={customNames.adName}
                    onChange={(e) => setCustomNames({ ...customNames, adName: e.target.value })}
                    placeholder={`${t('wizard.ad_placeholder')} 12345`}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            <Tip>{t('tips.ad_variations')}</Tip>

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
                                    <p className="text-gray-400 text-sm">{t('wizard.upload_media')}</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Text Inputs */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs uppercase text-gray-500 font-bold">{t('wizard.primary_text')}</label>
                            <textarea
                                value={creative.body}
                                onChange={(e) => setCreative({ ...creative, body: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 h-20 focus:border-blue-500 outline-none resize-none text-sm"
                                placeholder={t('wizard.primary_text_placeholder')}
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase text-gray-500 font-bold">{t('wizard.headline')}</label>
                            <input
                                value={creative.title}
                                onChange={(e) => setCreative({ ...creative, title: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:border-blue-500 outline-none text-sm"
                                placeholder={t('wizard.headline_placeholder')}
                            />
                        </div>

                        {/* Conditional Fields */}
                        {leadType === 'WEBSITE' || goal !== 'LEADS' ? (
                            <div>
                                <label className="text-xs uppercase text-gray-500 font-bold">{t('wizard.website_url')}</label>
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
                                    {t('wizard.instant_form_label')} <span className="text-red-400">*</span>
                                </label>
                                {isLoadingForms ? (
                                    <div className="flex items-center gap-2 text-sm text-blue-400 py-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('wizard.loading_forms')}
                                    </div>
                                ) : leadForms.length > 0 ? (
                                    <select
                                        value={creative.leadFormId}
                                        onChange={(e) => setCreative({ ...creative, leadFormId: e.target.value })}
                                        className="w-full bg-gray-900 border border-blue-500/30 rounded-lg p-3 focus:border-blue-500 outline-none text-sm"
                                        required
                                    >
                                        <option value="">{t('wizard.select_form')}</option>
                                        {leadForms.map((form) => (
                                            <option key={form.id} value={form.id}>{form.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-sm text-yellow-400 py-2">⚠️ {t('wizard.no_forms')} <a href={`/${locale}/learning`} className="text-blue-400 underline">{t('wizard.learn_create_form')}</a></p>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="text-xs uppercase text-gray-500 font-bold">{t('wizard.call_to_action')}</label>
                            <select
                                value={creative.cta}
                                onChange={(e) => setCreative({ ...creative, cta: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:border-blue-500 outline-none text-sm"
                            >
                                <option value="LEARN_MORE">{t('wizard.cta_learn_more')}</option>
                                <option value="SHOP_NOW">{t('wizard.cta_shop_now')}</option>
                                <option value="SIGN_UP">{t('wizard.cta_sign_up')}</option>
                                <option value="GET_OFFER">{t('wizard.cta_get_offer')}</option>
                                <option value="APPLY_NOW">{t('wizard.cta_apply_now')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div className="space-y-4">
                    {/* Format Toggle */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setPreviewFormat('feed')}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${previewFormat === 'feed' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                            {t('wizard.preview_feed')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreviewFormat('story')}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${previewFormat === 'story' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                            {t('wizard.preview_story')}
                        </button>
                    </div>

                    {/* Feed Preview */}
                    {previewFormat === 'feed' && (
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
                                        <video
                                            src={creative.previewUrl}
                                            className="w-full h-full object-cover"
                                            controls
                                            muted
                                            playsInline
                                        />
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
                    )}

                    {/* Story Preview */}
                    {previewFormat === 'story' && (
                        <div className="bg-black rounded-xl overflow-hidden shadow-xl border border-gray-800 aspect-[9/16] max-h-[400px] relative">
                            {creative.previewUrl ? (
                                creative.file?.type.startsWith('video') ? (
                                    <video
                                        src={creative.previewUrl}
                                        className="w-full h-full object-cover"
                                        controls
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <img src={creative.previewUrl} className="w-full h-full object-cover" />
                                )
                            ) : (
                                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                    <p className="text-gray-500 text-sm">Preview</p>
                                </div>
                            )}
                            {/* Story overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-white text-xs mb-2 line-clamp-2">{creative.body || "Your ad text..."}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-white text-sm font-bold truncate flex-1">{creative.title || "Headline"}</span>
                                    <span className="bg-white text-black px-3 py-1 rounded text-xs font-semibold ml-2">
                                        {creative.cta.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quality Checklist */}
                    <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                        <p className="text-xs font-bold text-gray-400 mb-2 uppercase">{t('wizard.quality_check')}</p>
                        <div className="space-y-1.5">
                            <QualityCheck passed={!!creative.file} label={t('wizard.quality_image_uploaded')} />
                            <QualityCheck passed={creative.title.length > 0 && creative.title.length <= 40} label={t('wizard.quality_headline_length')} hint={creative.title.length > 0 ? `${creative.title.length}/40` : undefined} />
                            <QualityCheck passed={creative.body.length >= 20} label={t('wizard.quality_primary_text')} hint={creative.body.length > 0 ? `${creative.body.length} chars` : undefined} />
                            <QualityCheck passed={!!creative.cta} label={t('wizard.quality_cta_selected')} />
                        </div>
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
        (!needsPixel || (selectedPixel && selectedConversionEvent)) &&
        (goal !== 'LEADS' || leadType !== 'FORM' || creative.leadFormId);

    return (
        <div className="min-h-screen bg-black text-white p-6">
            {/* Lead Type Modal */}
            {showLeadTypeModal && renderLeadTypeModal()}

            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6" dir={isRTL ? 'rtl' : 'ltr'}>
                    <button
                        onClick={() => router.push(`/${locale}/uploader`)}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 text-gray-400 hover:text-white"
                    >
                        <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                        <span className="text-sm">{t('edit.back_to_uploader')}</span>
                    </button>
                </div>
                <h1 className="text-3xl font-bold mb-8">{t('wizard.create_new_campaign')}</h1>

                {/* Page ID Warning - only show after accounts have loaded */}
                {!isAccountLoading && selectedAccount && !selectedAccount.page_id && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <div className="flex-1">
                                <span className="text-yellow-400 font-medium">{t('wizard.page_not_connected')}</span>
                                <button
                                    onClick={() => router.push(`/${locale}/settings?tab=accounts`)}
                                    className="ml-2 text-blue-400 underline text-sm"
                                >
                                    {t('wizard.reconnect_settings')}
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
                            {!goal && t('wizard.select_goal_continue')}
                            {goal === 'LEADS' && !leadType && t('wizard.select_lead_type')}
                            {goal && (goal !== 'LEADS' || leadType) && creative.file && !creative.title && t('wizard.add_headline')}
                            {canSubmit && t('wizard.ready_to_launch')}
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSubmitting}
                            className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            {t('wizard.launch_campaign')}
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
