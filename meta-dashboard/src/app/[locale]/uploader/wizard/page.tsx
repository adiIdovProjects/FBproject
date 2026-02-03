"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAccount } from '@/context/AccountContext';
import { mutationsService, SmartCampaignRequest } from '@/services/mutations.service';

// Import wizard components
import { WizardProvider, useWizard, AdCreative } from './components/WizardContext';
import WizardStepIndicator from './components/WizardStepIndicator';
import Step1Objective from './components/Step1Objective';
import Step2Location from './components/Step2Location';
import Step3Targeting from './components/Step3Targeting';
import Step4Budget from './components/Step4Budget';
import Step5Ads from './components/Step5Ads';
import Step2Setup from './components/Step2Setup';
import StepReview from './components/StepReview';

// Map app locale to Facebook locale format
const FB_LOCALE_MAP: Record<string, string> = {
    'en': 'en_US',
    'he': 'he_IL',
    'ar': 'ar_AR',
    'de': 'de_DE',
    'fr': 'fr_FR'
};

// Parse Facebook API errors to user-friendly messages
function parseFbError(err: Error & { response?: { data?: { detail?: string } } }): string {
    const msg = err.response?.data?.detail || err.message || '';

    const errorMap: Record<string, string> = {
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

    for (const [key, friendly] of Object.entries(errorMap)) {
        if (msg.includes(key)) return friendly;
    }

    return msg || 'An unexpected error occurred. Please try again.';
}

// Inner wizard component that has access to context
function WizardContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const locale = params.locale as string;
    const t = useTranslations();
    const isRTL = locale === 'he' || locale === 'ar';
    const fbLocale = FB_LOCALE_MAP[locale] || 'en_US';

    const { selectedAccountId, linkedAccounts, isLoading: isAccountLoading } = useAccount();
    const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);

    const { state, dispatch } = useWizard();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingClone, setIsLoadingClone] = useState(false);

    // Handle clone query parameter
    const cloneCampaignId = searchParams.get('clone');

    useEffect(() => {
        if (cloneCampaignId && !isLoadingClone) {
            loadCloneData(cloneCampaignId);
        }
    }, [cloneCampaignId]);

    const loadCloneData = async (campaignId: string) => {
        setIsLoadingClone(true);
        try {
            const cloneData = await mutationsService.getCampaignCloneData(campaignId);
            dispatch({ type: 'PREFILL_FROM_CAMPAIGN', data: cloneData });
        } catch (e) {
            console.error('Failed to load campaign clone data:', e);
            setError('Failed to load campaign data for cloning');
        } finally {
            setIsLoadingClone(false);
        }
    };

    // Step labels for indicator (7 steps)
    const stepLabels = [
        t('wizard.step_of', { current: 1, total: 7 }),
        t('wizard.step_of', { current: 2, total: 7 }),
        t('wizard.step_of', { current: 3, total: 7 }),
        t('wizard.step_of', { current: 4, total: 7 }),
        t('wizard.step_of', { current: 5, total: 7 }),
        t('wizard.step_of', { current: 6, total: 7 }),
        t('wizard.step_of', { current: 7, total: 7 }),
    ];

    // Check if pixel is needed
    const needsPixel = state.objective === 'SALES' ||
        (state.objective === 'LEADS' && state.leadType === 'WEBSITE');

    // Validate ad for submission
    const validateAd = (ad: AdCreative): string | null => {
        // Existing posts are already complete
        if (ad.useExistingPost) {
            if (!ad.objectStoryId) return "Please select an existing post";
            return null;  // Valid - no other fields needed
        }

        // Carousel validation
        if (ad.isCarousel) {
            const cards = ad.carouselCards || [];
            if (cards.length < 2) return "Carousel needs at least 2 cards";
            if (cards.length > 10) return "Carousel can have maximum 10 cards";
            const cardsWithMedia = cards.filter(c => c.file || c.previewUrl);
            if (cardsWithMedia.length < 2) return "Please upload images for at least 2 carousel cards";
            // Validate each card's file
            for (const card of cards) {
                if (card.file) {
                    const isVideo = card.file.type.startsWith('video/');
                    const maxSize = isVideo ? 4 * 1024 * 1024 * 1024 : 30 * 1024 * 1024;
                    if (card.file.size > maxSize) {
                        return isVideo ? "Carousel video must be under 4GB" : "Carousel image must be under 30MB";
                    }
                }
            }
        } else {
            // Single media validation - allow either a file upload OR an existing image URL (for cloned campaigns)
            if (!ad.file && !ad.existingImageUrl) return "Please upload an image or video";
        }

        if (!ad.title || ad.title.trim().length === 0) return "Please enter a headline";
        if (ad.body.length < 20) return "Primary text should be at least 20 characters";

        // File validation (only if a new file is uploaded, for single mode)
        if (!ad.isCarousel && ad.file) {
            const isVideo = ad.file.type.startsWith('video/');
            const maxSize = isVideo ? 4 * 1024 * 1024 * 1024 : 30 * 1024 * 1024;

            if (ad.file.size > maxSize) {
                return isVideo ? "Video must be under 4GB" : "Image must be under 30MB";
            }
        }

        // Destination validation
        if (state.objective === 'LEADS' && state.leadType === 'FORM') {
            if (!ad.leadFormId) return "Please select a lead form";
        } else if (state.objective !== 'LEADS' || state.leadType === 'WEBSITE') {
            if (ad.link) {
                try {
                    const url = new URL(ad.link);
                    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
                        return "Website URL must start with http:// or https://";
                    }
                } catch {
                    return "Please enter a valid website URL";
                }
            }
        }

        return null;
    };

    const handleSubmit = async () => {
        if (!selectedAccount) {
            setError("Please select an ad account first");
            return;
        }

        if (!selectedAccount.page_id) {
            setError("No Facebook Page connected to this account. Please reconnect your account in Settings.");
            return;
        }

        // Validate pixel
        if (needsPixel && !state.selectedPixel) {
            setError("Please select a Facebook Pixel to track conversions");
            return;
        }

        if (needsPixel && !state.selectedConversionEvent) {
            setError("Please select a conversion event");
            return;
        }

        // Validate at least one ad
        const validAds = state.ads.filter(ad => !validateAd(ad));
        if (validAds.length === 0) {
            const firstError = validateAd(state.ads[0]);
            setError(firstError || "Please complete at least one ad");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Upload all media in parallel (skip for existing posts)
            const mediaUploads = await Promise.all(
                validAds.map(async (ad) => {
                    // Existing posts don't need media upload
                    if (ad.useExistingPost) return { adId: ad.id, imageHash: undefined, videoId: undefined, carouselCards: undefined };

                    // Carousel mode - upload all card media
                    if (ad.isCarousel && ad.carouselCards && ad.carouselCards.length >= 2) {
                        const carouselUploads = await Promise.all(
                            ad.carouselCards.map(async (card) => {
                                if (!card.file) return { imageHash: undefined, videoId: undefined, title: card.title };
                                const isVideo = card.file.type.startsWith('video/');
                                const result = await mutationsService.uploadMedia(
                                    selectedAccount.account_id,
                                    card.file,
                                    isVideo
                                );
                                return {
                                    imageHash: isVideo ? undefined : result.image_hash,
                                    videoId: isVideo ? result.video_id : undefined,
                                    title: card.title
                                };
                            })
                        );
                        return { adId: ad.id, imageHash: undefined, videoId: undefined, carouselCards: carouselUploads };
                    }

                    // Single media mode
                    if (!ad.file) return { adId: ad.id, imageHash: undefined, videoId: undefined, carouselCards: undefined };

                    const isVideo = ad.file.type.startsWith('video/');
                    const result = await mutationsService.uploadMedia(
                        selectedAccount.account_id,
                        ad.file,
                        isVideo
                    );

                    return {
                        adId: ad.id,
                        imageHash: isVideo ? undefined : result.image_hash,
                        videoId: isVideo ? result.video_id : undefined,
                        carouselCards: undefined
                    };
                })
            );

            // 2. Build geo locations
            const allGeoLocations = [
                ...state.selectedLocations.map(loc => ({
                    key: loc.key,
                    type: loc.type,
                    name: loc.name,
                    country_code: loc.country_code
                })),
                ...state.customPins.map(pin => ({
                    key: pin.id,
                    type: 'custom_location' as const,
                    name: pin.name,
                    latitude: pin.lat,
                    longitude: pin.lng,
                    radius: pin.radius
                }))
            ];

            // 3. Create campaign with first ad
            const firstAd = validAds[0];
            const firstMedia = mediaUploads.find(m => m.adId === firstAd.id);
            const defaultCampaignName = `Campaign - ${state.objective} - ${new Date().toISOString().split('T')[0]}`;

            // Build carousel_cards for the creative if in carousel mode
            const carouselCards = firstMedia?.carouselCards?.map(card => ({
                image_hash: card.imageHash,
                video_id: card.videoId,
                title: card.title || ''
            }));

            const payload: SmartCampaignRequest = {
                account_id: selectedAccount.account_id,
                page_id: selectedAccount.page_id!,
                campaign_name: state.campaignName || defaultCampaignName,
                objective: state.objective!,
                geo_locations: allGeoLocations,
                age_min: state.ageMin,
                age_max: state.ageMax,
                genders: state.gender === 'all' ? undefined : state.gender === 'male' ? [1] : [2],
                publisher_platforms: state.platform === 'all' ? undefined : [state.platform],
                daily_budget_cents: state.dailyBudget * 100,
                pixel_id: needsPixel ? state.selectedPixel : undefined,
                conversion_event: needsPixel ? state.selectedConversionEvent : undefined,
                creative: {
                    title: firstAd.title,
                    body: firstAd.body,
                    call_to_action: firstAd.cta,
                    link_url: firstAd.link || undefined,
                    image_hash: firstMedia?.imageHash,
                    video_id: firstMedia?.videoId,
                    lead_form_id: (state.objective === 'LEADS' && state.leadType === 'FORM')
                        ? firstAd.leadFormId
                        : undefined,
                    object_story_id: firstAd.useExistingPost ? firstAd.objectStoryId : undefined,
                    carousel_cards: carouselCards && carouselCards.length >= 2 ? carouselCards : undefined
                },
                custom_audiences: state.selectedAudiences.length > 0 ? state.selectedAudiences : undefined,
                excluded_audiences: state.excludedAudiences.length > 0 ? state.excludedAudiences : undefined,
                interests: state.selectedInterests.length > 0 ? state.selectedInterests : undefined,
                locales: state.selectedLanguages.length > 0 ? state.selectedLanguages : undefined,
                start_date: state.useSchedule && state.startDate ? state.startDate : undefined,
                end_date: state.useSchedule && state.endDate ? state.endDate : undefined
            };

            const result = await mutationsService.createSmartCampaign(payload);

            // 4. Add additional ads to the same adset
            if (validAds.length > 1) {
                for (let i = 1; i < validAds.length; i++) {
                    const ad = validAds[i];
                    const media = mediaUploads.find(m => m.adId === ad.id);

                    // Build carousel_cards for additional ads if in carousel mode
                    const additionalCarouselCards = media?.carouselCards?.map(card => ({
                        image_hash: card.imageHash,
                        video_id: card.videoId,
                        title: card.title || ''
                    }));

                    await mutationsService.addCreativeToAdSet({
                        account_id: selectedAccount.account_id,
                        page_id: selectedAccount.page_id!,
                        campaign_id: result.campaign_id,
                        adset_id: result.adset_id,
                        creative: {
                            title: ad.title,
                            body: ad.body,
                            call_to_action: ad.cta,
                            link_url: ad.link || undefined,
                            image_hash: media?.imageHash,
                            video_id: media?.videoId,
                            lead_form_id: (state.objective === 'LEADS' && state.leadType === 'FORM')
                                ? ad.leadFormId
                                : undefined,
                            object_story_id: ad.useExistingPost ? ad.objectStoryId : undefined,
                            carousel_cards: additionalCarouselCards && additionalCarouselCards.length >= 2 ? additionalCarouselCards : undefined
                        },
                        ad_name: `Ad ${i + 1}`
                    });
                }
            }

            // Success - redirect
            console.log('Campaign created:', result);
            router.push(`/${locale}/manage`);

        } catch (err) {
            console.error(err);
            setError(parseFbError(err as Error));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Loading state
    if (isAccountLoading || isLoadingClone) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    {isLoadingClone && (
                        <p className="text-gray-400">{t('uploader.loading_campaign_data') || 'Loading campaign data...'}</p>
                    )}
                </div>
            </div>
        );
    }

    // No account selected
    if (!selectedAccount) {
        return (
            <div className="min-h-screen bg-black text-white p-6">
                <div className="max-w-2xl mx-auto text-center py-20">
                    <h2 className="text-xl font-bold mb-4">No Account Selected</h2>
                    <p className="text-gray-400 mb-6">Please select an ad account to create a campaign.</p>
                    <button
                        onClick={() => router.push(`/${locale}/select-accounts`)}
                        className="px-6 py-2 bg-accent text-white rounded-lg"
                    >
                        Select Account
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => state.currentStep === 1 ? router.push(`/${locale}/uploader`) : dispatch({ type: 'SET_STEP', step: (state.currentStep - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 })}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{t('uploader.new_campaign')}</h1>
                        <p className="text-sm text-gray-400">{selectedAccount.name}</p>
                    </div>
                </div>

                {/* Progress Indicator */}
                <WizardStepIndicator stepLabels={stepLabels} />

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                        {error}
                    </div>
                )}

                {/* Step Content */}
                <div className="bg-gray-900/30 rounded-2xl p-6 border border-gray-800">
                    {/* Step 1: Choose Objective */}
                    {state.currentStep === 1 && (
                        <Step1Objective t={t} pageId={selectedAccount.page_id || ''} accountId={selectedAccount.account_id} />
                    )}

                    {/* Step 2: Setup Check (pixel/forms/WhatsApp) */}
                    {state.currentStep === 2 && (
                        <Step2Setup t={t} accountId={selectedAccount.account_id} pageId={selectedAccount.page_id || ''} />
                    )}

                    {/* Step 3: Location */}
                    {state.currentStep === 3 && (
                        <Step2Location t={t} fbLocale={fbLocale} />
                    )}

                    {/* Step 4: Targeting */}
                    {state.currentStep === 4 && (
                        <Step3Targeting t={t} accountId={selectedAccount.account_id} pageId={selectedAccount.page_id || ''} />
                    )}

                    {/* Step 5: Budget & Schedule */}
                    {state.currentStep === 5 && (
                        <Step4Budget
                            t={t}
                            accountId={selectedAccount.account_id}
                            currency={selectedAccount.currency || 'USD'}
                        />
                    )}

                    {/* Step 6: Create Ads */}
                    {state.currentStep === 6 && (
                        <Step5Ads
                            t={t}
                            locale={locale}
                            pageId={selectedAccount.page_id || ''}
                            accountId={selectedAccount.account_id}
                            isSubmitting={false}
                            onSubmit={() => dispatch({ type: 'SET_STEP', step: 7 })}
                        />
                    )}

                    {/* Step 7: Review & Launch */}
                    {state.currentStep === 7 && (
                        <StepReview
                            t={t}
                            isSubmitting={isSubmitting}
                            onSubmit={handleSubmit}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// Main exported component wraps content with provider
export default function NewCampaignWizard() {
    return (
        <WizardProvider>
            <WizardContent />
        </WizardProvider>
    );
}
