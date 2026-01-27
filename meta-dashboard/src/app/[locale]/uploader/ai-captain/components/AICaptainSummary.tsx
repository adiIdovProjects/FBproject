"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, MapPin, Users, DollarSign, Image, Loader2, CheckCircle, XCircle, Target, Calendar } from 'lucide-react';
import { useCaptain } from './CaptainContext';
import { SpeechBubble } from './SpeechBubble';
import { useAccount } from '@/context/AccountContext';
import { mutationsService, SmartCampaignRequest } from '@/services/mutations.service';

// Parse Facebook API errors to user-friendly messages
function parseFbError(err: Error & { response?: { data?: { detail?: string } } }): string {
    const msg = err.response?.data?.detail || err.message || '';

    const errorMap: Record<string, string> = {
        'Permission denied': "Your Facebook account doesn't have permission to create ads.",
        'Budget too low': "Minimum budget is $1/day for your target audience.",
        'Invalid pixel': "No conversion pixel found. Please set up Facebook Pixel first.",
        'Invalid access token': "Your Facebook session has expired. Please log in again.",
        'Invalid creative': "There's an issue with your image or video. Please try a different file.",
        'Invalid page': "The selected Facebook page is invalid.",
    };

    for (const [key, friendly] of Object.entries(errorMap)) {
        if (msg.includes(key)) return friendly;
    }

    return msg || 'An unexpected error occurred. Please try again.';
}

export const AICaptainSummary: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;
    const t = useTranslations();
    const { state, dispatch } = useCaptain();
    const { selectedAccountId, linkedAccounts } = useAccount();
    const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isRTL = locale === 'he' || locale === 'ar';

    const handleSubmit = async () => {
        if (!selectedAccount) {
            setError("Please select an ad account first");
            return;
        }

        if (!selectedAccount.page_id) {
            setError("No Facebook Page connected. Please reconnect your account.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        dispatch({ type: 'SET_PHASE', phase: 'submitting' });

        try {
            if (state.flow === 'create') {
                await handleCreateCampaign();
            } else if (state.flow === 'add') {
                await handleAddCreative();
            } else if (state.flow === 'edit') {
                await handleEditCampaign();
            }
        } catch (err) {
            console.error(err);
            setError(parseFbError(err as Error));
            dispatch({ type: 'SET_PHASE', phase: 'summary' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateCampaign = async () => {
        if (!selectedAccount?.page_id) return;

        // Create campaign with first ad
        const firstAd = state.ads[0];

        // Upload media for first ad
        let imageHash: string | undefined;
        let videoId: string | undefined;

        if (firstAd.file) {
            const isVideo = firstAd.file.type.startsWith('video/');
            const result = await mutationsService.uploadMedia(
                selectedAccount.account_id,
                firstAd.file,
                isVideo
            );
            imageHash = isVideo ? undefined : result.image_hash;
            videoId = isVideo ? result.video_id : undefined;
        }

        // Build payload for first ad
        const payload: SmartCampaignRequest = {
            account_id: selectedAccount.account_id,
            page_id: selectedAccount.page_id,
            campaign_name: state.campaignName || `Campaign - ${state.objective} - ${new Date().toISOString().split('T')[0]}`,
            objective: state.objective!,
            geo_locations: state.selectedLocations.map(loc => ({
                key: loc.key,
                type: loc.type,
                name: loc.name,
                country_code: loc.country_code
            })),
            age_min: state.ageMin,
            age_max: state.ageMax,
            genders: state.targetingType === 'advantage' ? undefined : (state.gender === 'all' ? undefined : state.gender === 'male' ? [1] : [2]),
            publisher_platforms: state.targetingType === 'advantage' ? undefined : (state.platform === 'all' ? undefined : [state.platform]),
            custom_audiences: state.selectedAudiences.length > 0 ? state.selectedAudiences : undefined,
            interests: state.selectedInterests.length > 0 ? state.selectedInterests : undefined,
            daily_budget_cents: state.dailyBudget * 100,
            pixel_id: state.selectedPixel || undefined,
            use_advantage_targeting: state.targetingType === 'advantage' ? true : undefined,
            creative: {
                title: firstAd.title,
                body: firstAd.body,
                call_to_action: firstAd.cta,
                link_url: firstAd.link || undefined,
                image_hash: imageHash,
                video_id: videoId,
                lead_form_id: state.leadType === 'FORM' ? firstAd.leadFormId : undefined,
            },
            ad_name: firstAd.adName || undefined,
        };

        const result = await mutationsService.createSmartCampaign(payload);

        // If there are additional ads, add them to the same adset
        if (state.ads.length > 1 && result.adset_id) {
            for (let i = 1; i < state.ads.length; i++) {
                const ad = state.ads[i];

                let adImageHash: string | undefined;
                let adVideoId: string | undefined;

                if (ad.file) {
                    const isVideo = ad.file.type.startsWith('video/');
                    const uploadResult = await mutationsService.uploadMedia(
                        selectedAccount.account_id,
                        ad.file,
                        isVideo
                    );
                    adImageHash = isVideo ? undefined : uploadResult.image_hash;
                    adVideoId = isVideo ? uploadResult.video_id : undefined;
                }

                await mutationsService.addCreativeToAdSet({
                    account_id: selectedAccount.account_id,
                    page_id: selectedAccount.page_id,
                    campaign_id: result.campaign_id,
                    adset_id: result.adset_id,
                    creative: {
                        title: ad.title,
                        body: ad.body,
                        call_to_action: ad.cta,
                        link_url: ad.link || undefined,
                        image_hash: adImageHash,
                        video_id: adVideoId,
                        lead_form_id: state.leadType === 'FORM' ? ad.leadFormId : undefined,
                    },
                    ad_name: ad.adName || `Ad ${i + 1}`,
                });
            }
        }

        dispatch({ type: 'SET_CREATED_CAMPAIGN', campaignId: result.campaign_id });
    };

    const handleAddCreative = async () => {
        if (!selectedAccount?.page_id || !state.selectedCampaignId || !state.selectedAdSetId) return;

        const ad = state.ads[0];

        // Upload media if there's a file
        let imageHash: string | undefined;
        let videoId: string | undefined;

        if (ad.file) {
            const isVideo = ad.file.type.startsWith('video/');
            const result = await mutationsService.uploadMedia(
                selectedAccount.account_id,
                ad.file,
                isVideo
            );
            imageHash = isVideo ? undefined : result.image_hash;
            videoId = isVideo ? result.video_id : undefined;
        }

        await mutationsService.addCreativeToAdSet({
            account_id: selectedAccount.account_id,
            page_id: selectedAccount.page_id,
            campaign_id: state.selectedCampaignId,
            adset_id: state.selectedAdSetId,
            creative: {
                title: ad.title,
                body: ad.body,
                call_to_action: ad.cta,
                link_url: ad.link || undefined,
                image_hash: imageHash,
                video_id: videoId,
            },
            ad_name: `Ad - ${new Date().toISOString().split('T')[0]}`
        });

        dispatch({ type: 'SET_CREATED_CAMPAIGN', campaignId: state.selectedCampaignId });
    };

    const handleEditCampaign = async () => {
        if (!state.selectedAdSetId) return;

        if (state.editType === 'targeting') {
            await mutationsService.updateAdSetTargeting(state.selectedAdSetId, {
                geo_locations: state.selectedLocations.map(loc => ({
                    key: loc.key,
                    type: loc.type,
                    name: loc.name,
                    country_code: loc.country_code
                })),
                age_min: state.ageMin,
                age_max: state.ageMax,
            });
        } else if (state.editType === 'creative' && state.selectedAdId && selectedAccount?.page_id) {
            const ad = state.ads[0];

            let imageHash: string | undefined;
            let videoId: string | undefined;

            if (ad.file) {
                const isVideo = ad.file.type.startsWith('video/');
                const result = await mutationsService.uploadMedia(
                    selectedAccount.account_id,
                    ad.file,
                    isVideo
                );
                imageHash = isVideo ? undefined : result.image_hash;
                videoId = isVideo ? result.video_id : undefined;
            }

            await mutationsService.updateAdCreative(state.selectedAdId, {
                account_id: selectedAccount.account_id,
                page_id: selectedAccount.page_id,
                title: ad.title || undefined,
                body: ad.body || undefined,
                image_hash: imageHash,
                video_id: videoId,
            });
        }

        dispatch({ type: 'SET_CREATED_CAMPAIGN', campaignId: state.selectedCampaignId || '' });
    };

    // Success screen
    if (state.phase === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#1a1a2e] flex flex-col items-center justify-center p-6" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="text-8xl mb-6">
                    🎉
                </div>
                <SpeechBubble className="mb-8">
                    <p className="text-center font-medium text-green-600">
                        {t('captain.success')}
                    </p>
                </SpeechBubble>
                <div className="flex gap-4">
                    <button
                        onClick={() => router.push(`/${locale}/manage`)}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
                    >
                        {t('captain.view_campaign')}
                    </button>
                    <button
                        onClick={() => dispatch({ type: 'RESET' })}
                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
                    >
                        {t('captain.create_another')}
                    </button>
                </div>
            </div>
        );
    }

    // Submitting screen
    if (state.phase === 'submitting') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#1a1a2e] flex flex-col items-center justify-center p-6" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="text-7xl mb-6" style={{ animation: 'float 2s ease-in-out infinite' }}>
                    🤖
                </div>
                <SpeechBubble className="mb-8">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                        <p className="text-center font-medium">
                            {t('captain.launching')}
                        </p>
                    </div>
                </SpeechBubble>

                <style jsx global>{`
                    @keyframes float {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-10px); }
                    }
                `}</style>
            </div>
        );
    }

    // Summary screen
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#1a1a2e] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-gray-800">
                <button
                    onClick={() => dispatch({ type: 'BACK_TO_CHAT' })}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                    {t('captain.edit_something')}
                </button>
                <span className="text-amber-500 font-bold">{t('captain.title')}</span>
                <div className="w-20" />
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                    {/* Assistant with summary message */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="text-6xl mb-4">🤖</div>
                        <SpeechBubble>
                            <p className="text-center font-medium">
                                {t('captain.summary_ready')}
                            </p>
                        </SpeechBubble>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Summary cards */}
                    <div className="space-y-4">
                        {/* Campaign Info */}
                        {state.flow === 'create' && (
                            <SummaryCard
                                icon={<Target className="w-5 h-5" />}
                                title={t('captain.summary_campaign')}
                                color="blue"
                            >
                                <div className="space-y-1">
                                    <p className="text-white font-medium">{state.campaignName || 'Untitled Campaign'}</p>
                                    <p className="text-gray-400">
                                        {t('captain.objective')}: <span className="text-blue-400">{state.objective}</span>
                                    </p>
                                    {state.leadType && (
                                        <p className="text-gray-400">
                                            {t('captain.lead_type')}: <span className="text-blue-400">{state.leadType}</span>
                                        </p>
                                    )}
                                </div>
                            </SummaryCard>
                        )}

                        {/* Selected Campaign/AdSet (for add/edit flows) */}
                        {(state.flow === 'add' || state.flow === 'edit') && (
                            <SummaryCard
                                icon={<Target className="w-5 h-5" />}
                                title={state.flow === 'add' ? t('captain.summary_target') : t('captain.summary_editing')}
                                color="purple"
                            >
                                <div className="space-y-1">
                                    {state.selectedCampaignName && (
                                        <p className="text-white">
                                            {t('captain.campaign')}: {state.selectedCampaignName}
                                        </p>
                                    )}
                                    {state.selectedAdSetName && (
                                        <p className="text-gray-400">
                                            {t('captain.adset')}: {state.selectedAdSetName}
                                        </p>
                                    )}
                                </div>
                            </SummaryCard>
                        )}

                        {/* Targeting */}
                        {(state.flow === 'create' || state.editType === 'targeting') && state.selectedLocations.length > 0 && (
                            <SummaryCard
                                icon={<MapPin className="w-5 h-5" />}
                                title={t('captain.summary_targeting')}
                                color="green"
                            >
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-1">
                                        {state.selectedLocations.map(loc => (
                                            <span key={loc.key} className="text-sm bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                                                {loc.name}
                                            </span>
                                        ))}
                                    </div>
                                    {state.targetingType === 'advantage' ? (
                                        <p className="text-gray-400 text-sm">
                                            {t('captain.targeting_advantage_title')} - Meta AI will optimize targeting
                                        </p>
                                    ) : (
                                        <p className="text-gray-400 text-sm">
                                            {t('captain.age')}: {state.ageMin}-{state.ageMax} |{' '}
                                            {t('captain.gender')}: {state.gender === 'all' ? t('captain.opt_all_genders') : state.gender} |{' '}
                                            {t('captain.platform')}: {state.platform === 'all' ? t('captain.opt_both_platforms') : state.platform}
                                        </p>
                                    )}
                                    {state.selectedInterests.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            <span className="text-gray-500 text-xs">Interests:</span>
                                            {state.selectedInterests.map(interest => (
                                                <span key={interest.id} className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                                                    {interest.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </SummaryCard>
                        )}

                        {/* Budget */}
                        {state.flow === 'create' && (
                            <SummaryCard
                                icon={<DollarSign className="w-5 h-5" />}
                                title={t('captain.summary_budget')}
                                color="amber"
                            >
                                <p className="text-white text-2xl font-bold">
                                    ${state.dailyBudget}<span className="text-gray-400 text-base font-normal">/day</span>
                                </p>
                            </SummaryCard>
                        )}

                        {/* Ad Previews - Show all ads */}
                        {state.ads.length > 0 && state.ads.some(ad => ad.file || ad.title) && (
                            <SummaryCard
                                icon={<Image className="w-5 h-5" />}
                                title={state.ads.length > 1 ? t('captain.summary_ads', { count: state.ads.length }) : t('captain.summary_ad')}
                                color="pink"
                            >
                                <div className="space-y-4">
                                    {state.ads.map((ad, index) => (
                                        <div key={ad.id} className={`flex gap-4 ${index > 0 ? 'pt-4 border-t border-gray-700' : ''}`}>
                                            {ad.previewUrl && (
                                                <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                                                    {ad.file?.type.startsWith('video/') ? (
                                                        <video src={ad.previewUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <img src={ad.previewUrl} alt="Ad preview" className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                {(state.ads.length > 1 || ad.adName) && (
                                                    <p className="text-pink-400 text-xs font-medium mb-1">
                                                        {ad.adName || `Ad ${index + 1}`}
                                                    </p>
                                                )}
                                                <p className="text-white font-medium truncate">{ad.title || 'No headline'}</p>
                                                <p className="text-gray-400 text-sm line-clamp-2">{ad.body || 'No description'}</p>
                                                {ad.link && (
                                                    <p className="text-blue-400 text-xs mt-1 truncate">{ad.link}</p>
                                                )}
                                                <p className="text-gray-500 text-xs mt-1">
                                                    CTA: {ad.cta}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </SummaryCard>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-8 flex gap-4">
                        <button
                            onClick={() => dispatch({ type: 'BACK_TO_CHAT' })}
                            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
                        >
                            {t('captain.edit_something')}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {t('captain.launching')}
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    {t('captain.launch')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Summary card component
interface SummaryCardProps {
    icon: React.ReactNode;
    title: string;
    color: 'blue' | 'green' | 'amber' | 'pink' | 'purple';
    children: React.ReactNode;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, title, color, children }) => {
    const colorClasses = {
        blue: 'border-blue-500/30 bg-blue-500/5',
        green: 'border-green-500/30 bg-green-500/5',
        amber: 'border-amber-500/30 bg-amber-500/5',
        pink: 'border-pink-500/30 bg-pink-500/5',
        purple: 'border-purple-500/30 bg-purple-500/5',
    };

    const iconColorClasses = {
        blue: 'text-blue-400',
        green: 'text-green-400',
        amber: 'text-amber-400',
        pink: 'text-pink-400',
        purple: 'text-purple-400',
    };

    return (
        <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
            <div className="flex items-center gap-2 mb-3">
                <span className={iconColorClasses[color]}>{icon}</span>
                <h3 className="font-medium text-gray-300">{title}</h3>
            </div>
            {children}
        </div>
    );
};
