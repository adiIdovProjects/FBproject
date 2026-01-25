"use client";

import { useState, useEffect } from 'react';
import { Search, X, Loader2, Plus, Globe } from 'lucide-react';
import { useWizard } from './WizardContext';
import WizardNavigation from './WizardNavigation';
import { mutationsService, CustomAudience, Interest, InterestTarget, Pixel } from '@/services/mutations.service';

interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
    accountId: string;
    pageId: string;
}

export default function Step3Targeting({ t, accountId, pageId }: Props) {
    const { state, dispatch } = useWizard();

    // Custom audiences state
    const [customAudiences, setCustomAudiences] = useState<CustomAudience[]>([]);
    const [isLoadingAudiences, setIsLoadingAudiences] = useState(false);

    // Interest search state
    const [interestSearch, setInterestSearch] = useState('');
    const [interestResults, setInterestResults] = useState<Interest[]>([]);
    const [isSearchingInterests, setIsSearchingInterests] = useState(false);
    const [showInterestDropdown, setShowInterestDropdown] = useState(false);

    // Create audience modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [audienceType, setAudienceType] = useState<'website' | 'page_engagement' | 'lookalike'>('website');
    const [pixels, setPixels] = useState<Pixel[]>([]);
    const [isLoadingPixels, setIsLoadingPixels] = useState(false);
    const [isCreatingAudience, setIsCreatingAudience] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    // Website (Pixel) audience form
    const [newAudience, setNewAudience] = useState({
        name: '',
        pixelId: '',
        eventType: 'PageView',
        retentionDays: 30
    });
    // Page Engagement audience form
    const [pageEngagement, setPageEngagement] = useState({
        name: '',
        engagementType: 'page_engaged',
        retentionDays: 365
    });
    // Lookalike audience form
    const [lookalike, setLookalike] = useState({
        name: '',
        sourceAudienceId: '',
        countryCode: '',
        ratio: 0.01
    });

    // Load custom audiences
    const loadAudiences = async () => {
        if (!accountId) return;
        setIsLoadingAudiences(true);
        try {
            const audiences = await mutationsService.getCustomAudiences(accountId);
            setCustomAudiences(audiences);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingAudiences(false);
        }
    };

    useEffect(() => {
        if (state.audienceMode === 'custom' && accountId) {
            loadAudiences();
        }
    }, [state.audienceMode, accountId]);

    // Load pixels when modal opens
    useEffect(() => {
        if (showCreateModal && accountId && pixels.length === 0) {
            setIsLoadingPixels(true);
            mutationsService.getPixels(accountId)
                .then((data) => {
                    setPixels(data);
                    if (data.length > 0) {
                        setNewAudience(prev => ({ ...prev, pixelId: data[0].id }));
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoadingPixels(false));
        }
    }, [showCreateModal, accountId]);

    // Search interests
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
                    (r: Interest) => !state.selectedInterests.some((i: InterestTarget) => i.id === r.id)
                );
                setInterestResults(filtered);
                setShowInterestDropdown(true);
            } catch (e) {
                console.error('Interest search failed:', e);
            } finally {
                setIsSearchingInterests(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [interestSearch, state.selectedInterests]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = () => setShowInterestDropdown(false);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleAudienceToggle = (id: string, isExclude: boolean = false) => {
        if (isExclude) {
            const current = state.excludedAudiences;
            const updated = current.includes(id)
                ? current.filter(a => a !== id)
                : [...current, id];
            dispatch({ type: 'SET_EXCLUDED_AUDIENCES', audiences: updated });
        } else {
            const current = state.selectedAudiences;
            const updated = current.includes(id)
                ? current.filter(a => a !== id)
                : [...current, id];
            dispatch({ type: 'SET_AUDIENCES', audiences: updated });
        }
    };

    const addInterest = (interest: Interest) => {
        dispatch({
            type: 'SET_INTERESTS',
            interests: [...state.selectedInterests, { id: interest.id, name: interest.name }]
        });
        setInterestSearch('');
        setShowInterestDropdown(false);
    };

    const removeInterest = (id: string) => {
        dispatch({
            type: 'SET_INTERESTS',
            interests: state.selectedInterests.filter(i => i.id !== id)
        });
    };

    const handleNext = () => {
        dispatch({ type: 'SET_STEP', step: 5 });
    };

    const handleCreateAudience = async () => {
        setIsCreatingAudience(true);
        setCreateError(null);

        try {
            if (audienceType === 'website') {
                if (!newAudience.name.trim() || !newAudience.pixelId) return;
                await mutationsService.createCustomAudience(
                    accountId,
                    newAudience.name.trim(),
                    newAudience.pixelId,
                    newAudience.eventType,
                    newAudience.retentionDays
                );
            } else if (audienceType === 'page_engagement') {
                if (!pageEngagement.name.trim() || !pageId) return;
                await mutationsService.createPageEngagementAudience(
                    accountId,
                    pageEngagement.name.trim(),
                    pageId,
                    pageEngagement.engagementType,
                    pageEngagement.retentionDays
                );
            } else if (audienceType === 'lookalike') {
                if (!lookalike.name.trim() || !lookalike.sourceAudienceId || !lookalike.countryCode) return;
                await mutationsService.createLookalikeAudience(
                    accountId,
                    lookalike.name.trim(),
                    lookalike.sourceAudienceId,
                    lookalike.countryCode,
                    lookalike.ratio
                );
            }
            // Refresh audiences list
            await loadAudiences();
            // Close modal and reset forms
            setShowCreateModal(false);
            setNewAudience({ name: '', pixelId: pixels[0]?.id || '', eventType: 'PageView', retentionDays: 30 });
            setPageEngagement({ name: '', engagementType: 'page_engaged', retentionDays: 365 });
            setLookalike({ name: '', sourceAudienceId: '', countryCode: '', ratio: 0.01 });
        } catch (e) {
            setCreateError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsCreatingAudience(false);
        }
    };

    const eventTypes = [
        { value: 'PageView', label: t('wizard.event_pageview') || 'Page View' },
        { value: 'ViewContent', label: t('wizard.event_viewcontent') || 'View Content' },
        { value: 'AddToCart', label: t('wizard.event_addtocart') || 'Add to Cart' },
        { value: 'Purchase', label: t('wizard.event_purchase') || 'Purchase' },
        { value: 'Lead', label: t('wizard.event_lead') || 'Lead' }
    ];

    const engagementTypes = [
        { value: 'page_engaged', label: t('wizard.engagement_all') || 'All Page Engagement' },
        { value: 'page_visited', label: t('wizard.engagement_visited') || 'Visited Page' },
        { value: 'page_liked', label: t('wizard.engagement_liked') || 'Liked Page' },
        { value: 'page_saved', label: t('wizard.engagement_saved') || 'Saved Page' },
        { value: 'page_messaged', label: t('wizard.engagement_messaged') || 'Messaged Page' }
    ];

    const lookalikeRatios = [
        { value: 0.01, label: '1%' },
        { value: 0.02, label: '2%' },
        { value: 0.03, label: '3%' },
        { value: 0.05, label: '5%' },
        { value: 0.10, label: '10%' }
    ];

    const canCreate = () => {
        if (audienceType === 'website') {
            return newAudience.name.trim() && newAudience.pixelId;
        } else if (audienceType === 'page_engagement') {
            return pageEngagement.name.trim() && pageId;
        } else if (audienceType === 'lookalike') {
            return lookalike.name.trim() && lookalike.sourceAudienceId && lookalike.countryCode;
        }
        return false;
    };

    // Common Facebook locale codes for language targeting
    const availableLanguages = [
        { code: 6, name: 'English' },
        { code: 23, name: 'עברית (Hebrew)' },
        { code: 28, name: 'العربية (Arabic)' },
        { code: 10, name: 'Español (Spanish)' },
        { code: 9, name: 'Français (French)' },
        { code: 5, name: 'Deutsch (German)' },
        { code: 16, name: 'Italiano (Italian)' },
        { code: 25, name: 'Português (Portuguese)' },
        { code: 1001, name: '中文 (Chinese)' },
        { code: 27, name: '日本語 (Japanese)' },
        { code: 1017, name: '한국어 (Korean)' },
        { code: 22, name: 'हिन्दी (Hindi)' },
        { code: 24, name: 'Русский (Russian)' },
        { code: 31, name: 'Türkçe (Turkish)' },
        { code: 30, name: 'Polski (Polish)' },
        { code: 11, name: 'Nederlands (Dutch)' },
    ];

    const toggleLanguage = (code: number) => {
        const current = state.selectedLanguages;
        const updated = current.includes(code)
            ? current.filter(c => c !== code)
            : [...current, code];
        dispatch({ type: 'SET_LANGUAGES', languages: updated });
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-200">{t('wizard.audience_targeting')}</h2>

            {/* Audience Mode Toggle */}
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            dispatch({ type: 'SET_AUDIENCE_MODE', mode: 'advantage_plus' });
                            dispatch({ type: 'SET_AUDIENCES', audiences: [] });
                            dispatch({ type: 'SET_EXCLUDED_AUDIENCES', audiences: [] });
                            dispatch({ type: 'SET_INTERESTS', interests: [] });
                        }}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                            state.audienceMode === 'advantage_plus'
                                ? 'border-green-500 bg-green-500/10'
                                : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">✨</span>
                            <span className="font-bold text-white text-sm">{t('wizard.advantage_plus')}</span>
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                {t('wizard.recommended')}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400">{t('wizard.advantage_plus_desc')}</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => dispatch({ type: 'SET_AUDIENCE_MODE', mode: 'custom' })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                            state.audienceMode === 'custom'
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🎯</span>
                            <span className="font-bold text-white text-sm">{t('wizard.custom_audience')}</span>
                        </div>
                        <p className="text-xs text-gray-400">{t('wizard.custom_audience_desc')}</p>
                    </button>
                </div>

                {/* Custom Audiences Section */}
                {state.audienceMode === 'custom' && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-4">
                        {/* Include Audiences */}
                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-2 block">
                                {t('wizard.select_audiences')}
                            </label>
                            {isLoadingAudiences ? (
                                <div className="flex items-center gap-2 text-sm text-blue-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('wizard.loading_audiences')}
                                </div>
                            ) : customAudiences.length > 0 ? (
                                <div className="space-y-2 max-h-36 overflow-y-auto">
                                    {customAudiences
                                        .filter(a => !state.excludedAudiences.includes(a.id))
                                        .map((audience) => (
                                            <label
                                                key={audience.id}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={state.selectedAudiences.includes(audience.id)}
                                                    onChange={() => handleAudienceToggle(audience.id)}
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
                            ) : (
                                <p className="text-sm text-yellow-400">{t('wizard.no_audiences')}</p>
                            )}
                            {/* Create Audience Button */}
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="mt-2 flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                {t('wizard.create_audience')}
                            </button>
                        </div>

                        {/* Exclude Audiences */}
                        {customAudiences.length > 0 && (
                            <div className="pt-3 border-t border-red-500/20">
                                <label className="text-sm font-medium text-red-400 mb-2 block">
                                    {t('wizard.exclude_audiences')}
                                </label>
                                <div className="space-y-2 max-h-36 overflow-y-auto">
                                    {customAudiences
                                        .filter(a => !state.selectedAudiences.includes(a.id))
                                        .map((audience) => (
                                            <label
                                                key={audience.id}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-500/5 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={state.excludedAudiences.includes(audience.id)}
                                                    onChange={() => handleAudienceToggle(audience.id, true)}
                                                    className="w-4 h-4 accent-red-500"
                                                />
                                                <div className="flex-1">
                                                    <span className="text-sm text-white">{audience.name}</span>
                                                    <span className="text-xs text-gray-500 ml-2">({audience.type_label})</span>
                                                </div>
                                            </label>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Interest Targeting */}
                        <div className="pt-3 border-t border-blue-500/20">
                            <label className="text-sm font-medium text-gray-300 mb-1 block">
                                {t('wizard.interest_targeting')}
                            </label>
                            <p className="text-xs text-gray-500 mb-2">{t('wizard.interest_hint')}</p>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
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

                                {showInterestDropdown && interestResults.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {interestResults.map((interest) => (
                                            <button
                                                key={interest.id}
                                                type="button"
                                                onClick={() => addInterest(interest)}
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

                            {state.selectedInterests.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {state.selectedInterests.map((interest) => (
                                        <span
                                            key={interest.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                                        >
                                            🎯 {interest.name}
                                            <button
                                                type="button"
                                                onClick={() => removeInterest(interest.id)}
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

            {/* Demographics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Age */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">
                        {t('wizard.age')}: {state.ageMin} - {state.ageMax}+
                    </label>
                    <div className="flex gap-2 items-center">
                        <input
                            type="range"
                            min="18"
                            max="65"
                            value={state.ageMin}
                            onChange={(e) => dispatch({
                                type: 'SET_AGE_RANGE',
                                ageMin: parseInt(e.target.value),
                                ageMax: state.ageMax
                            })}
                            className="w-full accent-blue-500"
                        />
                        <input
                            type="range"
                            min="18"
                            max="65"
                            value={state.ageMax}
                            onChange={(e) => dispatch({
                                type: 'SET_AGE_RANGE',
                                ageMin: state.ageMin,
                                ageMax: parseInt(e.target.value)
                            })}
                            className="w-full accent-blue-500"
                        />
                    </div>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">{t('wizard.gender')}</label>
                    <div className="flex gap-2">
                        {(['all', 'male', 'female'] as const).map((g) => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => dispatch({ type: 'SET_GENDER', gender: g })}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                    state.gender === g
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                {t(`wizard.gender_${g}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Platform */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">{t('wizard.platform')}</label>
                    <div className="flex gap-2">
                        {(['all', 'facebook', 'instagram'] as const).map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => dispatch({ type: 'SET_PLATFORM', platform: p })}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                    state.platform === p
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                {t(`wizard.platform_${p}`)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Language Targeting */}
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <label className="text-sm font-medium text-gray-300">
                        {t('wizard.language_targeting') || 'Language Targeting'}
                    </label>
                    <span className="text-xs text-gray-500">
                        ({t('wizard.language_optional') || 'Optional'})
                    </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                    {t('wizard.language_hint') || 'Target users who speak specific languages. Leave empty for all languages.'}
                </p>
                <div className="flex flex-wrap gap-2">
                    {availableLanguages.map((lang) => (
                        <button
                            key={lang.code}
                            type="button"
                            onClick={() => toggleLanguage(lang.code)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                state.selectedLanguages.includes(lang.code)
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            {lang.name}
                        </button>
                    ))}
                </div>
                {state.selectedLanguages.length > 0 && (
                    <button
                        type="button"
                        onClick={() => dispatch({ type: 'SET_LANGUAGES', languages: [] })}
                        className="mt-2 text-xs text-gray-400 hover:text-gray-300"
                    >
                        {t('common.clear') || 'Clear all'}
                    </button>
                )}
            </div>

            <WizardNavigation
                onNext={handleNext}
                canProceed={true}
                nextLabel={t('common.next') || 'Next'}
                backLabel={t('common.back') || 'Back'}
            />

            {/* Create Audience Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">{t('wizard.create_audience')}</h3>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Audience Type Tabs */}
                        <div className="flex gap-1 mb-4 p-1 bg-gray-800 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setAudienceType('website')}
                                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                                    audienceType === 'website'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {t('wizard.website_visitors') || 'Website'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setAudienceType('page_engagement')}
                                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                                    audienceType === 'page_engagement'
                                        ? 'bg-purple-600 text-white'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {t('wizard.page_engagement') || 'Page'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setAudienceType('lookalike')}
                                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                                    audienceType === 'lookalike'
                                        ? 'bg-green-600 text-white'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {t('wizard.lookalike') || 'Lookalike'}
                            </button>
                        </div>

                        {createError && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                                {createError}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Website (Pixel) Audience Form */}
                            {audienceType === 'website' && (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-1 block">
                                            {t('wizard.audience_name')}
                                        </label>
                                        <input
                                            type="text"
                                            value={newAudience.name}
                                            onChange={(e) => setNewAudience(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder={t('wizard.audience_name_placeholder') || 'e.g., Website Visitors - 30 Days'}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-1 block">
                                            {t('wizard.select_pixel')}
                                        </label>
                                        {isLoadingPixels ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {t('common.loading')}
                                            </div>
                                        ) : pixels.length > 0 ? (
                                            <select
                                                value={newAudience.pixelId}
                                                onChange={(e) => setNewAudience(prev => ({ ...prev, pixelId: e.target.value }))}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                                            >
                                                {pixels.map((pixel) => (
                                                    <option key={pixel.id} value={pixel.id}>{pixel.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <p className="text-sm text-yellow-400">{t('wizard.no_pixels')}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-1 block">
                                            {t('wizard.event_type')}
                                        </label>
                                        <select
                                            value={newAudience.eventType}
                                            onChange={(e) => setNewAudience(prev => ({ ...prev, eventType: e.target.value }))}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                                        >
                                            {eventTypes.map((et) => (
                                                <option key={et.value} value={et.value}>{et.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-1 block">
                                            {t('wizard.retention_days')}: {newAudience.retentionDays} {t('wizard.days')}
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="180"
                                            value={newAudience.retentionDays}
                                            onChange={(e) => setNewAudience(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }))}
                                            className="w-full accent-blue-500"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>1 {t('wizard.day')}</span>
                                            <span>180 {t('wizard.days')}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Page Engagement Audience Form */}
                            {audienceType === 'page_engagement' && (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-1 block">
                                            {t('wizard.audience_name')}
                                        </label>
                                        <input
                                            type="text"
                                            value={pageEngagement.name}
                                            onChange={(e) => setPageEngagement(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder={t('wizard.page_audience_placeholder') || 'e.g., Page Followers - 365 Days'}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-1 block">
                                            {t('wizard.engagement_type')}
                                        </label>
                                        <select
                                            value={pageEngagement.engagementType}
                                            onChange={(e) => setPageEngagement(prev => ({ ...prev, engagementType: e.target.value }))}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500"
                                        >
                                            {engagementTypes.map((et) => (
                                                <option key={et.value} value={et.value}>{et.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-1 block">
                                            {t('wizard.retention_days')}: {pageEngagement.retentionDays} {t('wizard.days')}
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="365"
                                            value={pageEngagement.retentionDays}
                                            onChange={(e) => setPageEngagement(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }))}
                                            className="w-full accent-purple-500"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>1 {t('wizard.day')}</span>
                                            <span>365 {t('wizard.days')}</span>
                                        </div>
                                    </div>
                                    {!pageId && (
                                        <p className="text-sm text-yellow-400">{t('wizard.select_page_first') || 'Please select a Facebook Page in Step 1 first'}</p>
                                    )}
                                </>
                            )}

                            {/* Lookalike Audience Form */}
                            {audienceType === 'lookalike' && (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-1 block">
                                            {t('wizard.audience_name')}
                                        </label>
                                        <input
                                            type="text"
                                            value={lookalike.name}
                                            onChange={(e) => setLookalike(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder={t('wizard.lookalike_placeholder') || 'e.g., 1% Lookalike - US'}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-1 block">
                                            {t('wizard.source_audience')}
                                        </label>
                                        {customAudiences.length > 0 ? (
                                            <select
                                                value={lookalike.sourceAudienceId}
                                                onChange={(e) => setLookalike(prev => ({ ...prev, sourceAudienceId: e.target.value }))}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-green-500"
                                            >
                                                <option value="">{t('wizard.select_source') || 'Select source audience...'}</option>
                                                {customAudiences.map((audience) => (
                                                    <option key={audience.id} value={audience.id}>{audience.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <p className="text-sm text-yellow-400">{t('wizard.no_source_audiences') || 'Create a custom audience first'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-1 block">
                                            {t('wizard.country_code')}
                                        </label>
                                        <input
                                            type="text"
                                            value={lookalike.countryCode}
                                            onChange={(e) => setLookalike(prev => ({ ...prev, countryCode: e.target.value.toUpperCase().slice(0, 2) }))}
                                            placeholder="US, IL, DE..."
                                            maxLength={2}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 mb-1 block">
                                            {t('wizard.lookalike_size')}
                                        </label>
                                        <select
                                            value={lookalike.ratio}
                                            onChange={(e) => setLookalike(prev => ({ ...prev, ratio: parseFloat(e.target.value) }))}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-green-500"
                                        >
                                            {lookalikeRatios.map((r) => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {t('wizard.lookalike_hint') || 'Smaller % = more similar to source audience'}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateAudience}
                                disabled={!canCreate() || isCreatingAudience}
                                className={`flex-1 py-2 px-4 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                    audienceType === 'website' ? 'bg-blue-600 hover:bg-blue-500' :
                                    audienceType === 'page_engagement' ? 'bg-purple-600 hover:bg-purple-500' :
                                    'bg-green-600 hover:bg-green-500'
                                }`}
                            >
                                {isCreatingAudience && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('wizard.create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
