"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Image as ImageIcon, Loader2, TrendingUp, Check, Film } from 'lucide-react';
import { mutationsService, AdForCreativeClone } from '@/services/mutations.service';
import { useCaptain } from './CaptainContext';

interface CopyCreativeModalProps {
    isOpen: boolean;
    onClose: () => void;
    accountId: string;
}

export default function CopyCreativeModal({
    isOpen,
    onClose,
    accountId
}: CopyCreativeModalProps) {
    const t = useTranslations();
    const { dispatch } = useCaptain();

    const [ads, setAds] = useState<AdForCreativeClone[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch ads when modal opens
    useEffect(() => {
        if (isOpen && accountId) {
            fetchAds();
        }
    }, [isOpen, accountId]);

    const fetchAds = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const recs = await mutationsService.getHistoricalRecommendations(accountId);
            setAds(recs.ads_for_creative_clone || []);
        } catch (err) {
            console.error('Failed to fetch ads:', err);
            setError(t('captain.copy_creative_error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyCreative = () => {
        if (!selectedAdId) return;

        const selectedAd = ads.find(ad => ad.ad_id === selectedAdId);
        if (!selectedAd) return;

        // Apply creative data to current ad
        dispatch({
            type: 'UPDATE_CURRENT_AD',
            updates: {
                title: selectedAd.title || '',
                body: selectedAd.body || '',
                cta: selectedAd.cta || 'LEARN_MORE',
                // Note: link is not included as user still needs to enter their own URL
            }
        });

        onClose();
    };

    const selectedAd = ads.find(ad => ad.ad_id === selectedAdId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700 bg-purple-900/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-900/30 border border-purple-600">
                                <ImageIcon className="w-5 h-5 text-purple-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white">
                                {t('captain.copy_creative_title')}
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
                        {t('captain.copy_creative_description')}
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <p className="text-red-400">{error}</p>
                            <button
                                onClick={fetchAds}
                                className="mt-3 text-sm text-purple-400 hover:underline"
                            >
                                {t('common.try_again')}
                            </button>
                        </div>
                    ) : ads.length === 0 ? (
                        <div className="text-center py-8">
                            <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">{t('captain.no_ads_found')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {ads.map((ad) => (
                                <button
                                    key={ad.ad_id}
                                    onClick={() => setSelectedAdId(ad.ad_id)}
                                    className={`relative rounded-xl border overflow-hidden transition-all ${
                                        selectedAdId === ad.ad_id
                                            ? 'border-purple-500 ring-2 ring-purple-500/50'
                                            : 'border-gray-700 hover:border-gray-600'
                                    }`}
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-square bg-gray-800 relative">
                                        {ad.thumbnail_url ? (
                                            <img
                                                src={ad.thumbnail_url}
                                                alt={ad.ad_name || 'Ad'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className="w-8 h-8 text-gray-600" />
                                            </div>
                                        )}

                                        {/* Video badge */}
                                        {ad.is_video && (
                                            <div className="absolute top-2 left-2 p-1 rounded bg-purple-500/80">
                                                <Film className="w-3 h-3 text-white" />
                                            </div>
                                        )}

                                        {/* Selected indicator */}
                                        {selectedAdId === ad.ad_id && (
                                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}

                                        {/* CTR badge */}
                                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            {ad.ctr.toFixed(1)}%
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-2 bg-gray-800">
                                        <p className="text-xs text-white truncate font-medium">
                                            {ad.title || ad.ad_name || 'Untitled'}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            {ad.body ? ad.body.slice(0, 40) + (ad.body.length > 40 ? '...' : '') : 'No body text'}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Preview of selected ad */}
                {selectedAd && (
                    <div className="px-4 pb-2">
                        <div className="p-3 bg-gray-800 rounded-xl border border-gray-700">
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                                {t('captain.copy_creative_preview')}
                            </p>
                            <p className="text-sm text-white font-medium">
                                {selectedAd.title || 'No headline'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                {selectedAd.body || 'No body text'}
                            </p>
                            {selectedAd.cta && (
                                <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                                    {selectedAd.cta.replace(/_/g, ' ')}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-700 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-600 transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleCopyCreative}
                        disabled={!selectedAdId}
                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <ImageIcon className="w-4 h-4" />
                        {t('captain.copy_creative_button')}
                    </button>
                </div>
            </div>
        </div>
    );
}
