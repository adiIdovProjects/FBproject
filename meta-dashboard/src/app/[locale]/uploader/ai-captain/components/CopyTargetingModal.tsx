"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Target, Loader2, TrendingUp, MapPin, Users, Check } from 'lucide-react';
import { mutationsService, CampaignForClone, CampaignCloneData } from '@/services/mutations.service';
import { useCaptain } from './CaptainContext';

interface CopyTargetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    accountId: string;
}

export default function CopyTargetingModal({
    isOpen,
    onClose,
    accountId
}: CopyTargetingModalProps) {
    const t = useTranslations();
    const { dispatch } = useCaptain();

    const [campaigns, setCampaigns] = useState<CampaignForClone[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch campaigns when modal opens
    useEffect(() => {
        if (isOpen && accountId) {
            fetchCampaigns();
        }
    }, [isOpen, accountId]);

    const fetchCampaigns = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const recs = await mutationsService.getHistoricalRecommendations(accountId);
            setCampaigns(recs.campaigns_for_clone || []);
        } catch (err) {
            console.error('Failed to fetch campaigns:', err);
            setError(t('captain.copy_targeting_error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyTargeting = async () => {
        if (!selectedCampaignId) return;

        setIsCopying(true);
        setError(null);
        try {
            // Fetch full campaign clone data
            const cloneData: CampaignCloneData = await mutationsService.getCampaignCloneData(selectedCampaignId);

            // Apply targeting to state
            if (cloneData.targeting?.locations && cloneData.targeting.locations.length > 0) {
                dispatch({
                    type: 'SET_LOCATIONS',
                    locations: cloneData.targeting.locations.map(loc => ({
                        key: loc.key,
                        name: loc.name,
                        type: loc.type,
                        country_code: loc.country_code,
                        display_name: loc.name
                    }))
                });
            }

            if (cloneData.targeting?.age_min && cloneData.targeting?.age_max) {
                dispatch({
                    type: 'SET_AGE_RANGE',
                    ageMin: cloneData.targeting.age_min,
                    ageMax: cloneData.targeting.age_max
                });
            }

            if (cloneData.targeting?.genders) {
                const genders = cloneData.targeting.genders;
                if (genders.includes(1) && !genders.includes(2)) {
                    dispatch({ type: 'SET_GENDER', gender: 'male' });
                } else if (genders.includes(2) && !genders.includes(1)) {
                    dispatch({ type: 'SET_GENDER', gender: 'female' });
                } else {
                    dispatch({ type: 'SET_GENDER', gender: 'all' });
                }
            }

            if (cloneData.targeting?.publisher_platforms) {
                const platforms = cloneData.targeting.publisher_platforms;
                if (platforms.includes('facebook') && !platforms.includes('instagram')) {
                    dispatch({ type: 'SET_PLATFORM', platform: 'facebook' });
                } else if (platforms.includes('instagram') && !platforms.includes('facebook')) {
                    dispatch({ type: 'SET_PLATFORM', platform: 'instagram' });
                } else {
                    dispatch({ type: 'SET_PLATFORM', platform: 'all' });
                }
            }

            onClose();
        } catch (err) {
            console.error('Failed to copy targeting:', err);
            setError(t('captain.copy_targeting_failed'));
        } finally {
            setIsCopying(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700 bg-blue-900/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-900/30 border border-blue-600">
                                <Target className="w-5 h-5 text-blue-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white">
                                {t('captain.copy_targeting_title')}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">
                        {t('captain.copy_targeting_description')}
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <p className="text-red-400">{error}</p>
                            <button
                                onClick={fetchCampaigns}
                                className="mt-3 text-sm text-blue-400 hover:underline"
                            >
                                {t('common.try_again')}
                            </button>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="text-center py-8">
                            <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">{t('captain.no_campaigns_found')}</p>
                        </div>
                    ) : (
                        campaigns.map((campaign) => (
                            <button
                                key={campaign.campaign_id}
                                onClick={() => setSelectedCampaignId(campaign.campaign_id)}
                                className={`w-full p-4 rounded-xl border transition-all text-left ${
                                    selectedCampaignId === campaign.campaign_id
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                                        selectedCampaignId === campaign.campaign_id
                                            ? 'border-blue-500 bg-blue-500'
                                            : 'border-gray-600'
                                    }`}>
                                        {selectedCampaignId === campaign.campaign_id && (
                                            <Check className="w-3 h-3 text-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">
                                            {campaign.campaign_name}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" />
                                                ROAS {campaign.roas.toFixed(1)}x
                                            </span>
                                            <span>
                                                {formatCurrency(campaign.spend)} spent
                                            </span>
                                            <span>
                                                {campaign.ctr.toFixed(1)}% CTR
                                            </span>
                                        </div>
                                        {campaign.objective && (
                                            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                                                {campaign.objective}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-700 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-600 transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleCopyTargeting}
                        disabled={!selectedCampaignId || isCopying}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isCopying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Target className="w-4 h-4" />
                                {t('captain.copy_targeting_button')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
