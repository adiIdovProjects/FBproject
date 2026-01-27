"use client";

import React from 'react';
import { Image as ImageIcon, ExternalLink, ThumbsUp, MessageCircle, Share2, ChevronLeft, ChevronRight, Copy, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCaptain } from './CaptainContext';

interface AdPreviewPanelProps {
    className?: string;
}

// CTA button display text mapping
const CTA_DISPLAY: Record<string, string> = {
    LEARN_MORE: 'Learn More',
    SHOP_NOW: 'Shop Now',
    SIGN_UP: 'Sign Up',
    CONTACT_US: 'Contact Us',
    GET_OFFER: 'Get Offer',
    APPLY_NOW: 'Apply Now',
    WHATSAPP_MESSAGE: 'Send Message',
    GET_QUOTE: 'Get Quote',
    CALL_NOW: 'Call Now',
};

export const AdPreviewPanel: React.FC<AdPreviewPanelProps> = ({ className = '' }) => {
    const t = useTranslations();
    const { state, dispatch } = useCaptain();

    const currentAd = state.ads[state.currentAdIndex];
    if (!currentAd) return null;

    const hasContent = currentAd.file || currentAd.previewUrl || currentAd.title || currentAd.body;

    const goToPrevAd = () => {
        if (state.currentAdIndex > 0) {
            dispatch({ type: 'SET_CURRENT_AD_INDEX', index: state.currentAdIndex - 1 });
        }
    };

    const goToNextAd = () => {
        if (state.currentAdIndex < state.ads.length - 1) {
            dispatch({ type: 'SET_CURRENT_AD_INDEX', index: state.currentAdIndex + 1 });
        }
    };

    const duplicateAd = () => {
        dispatch({ type: 'DUPLICATE_AD', index: state.currentAdIndex });
    };

    const deleteAd = () => {
        if (state.ads.length > 1) {
            dispatch({ type: 'DELETE_AD', index: state.currentAdIndex });
        }
    };

    return (
        <div className={`bg-gray-900/50 rounded-xl border border-gray-800 p-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-300">{t('captain.preview_title')}</h3>
                {state.ads.length > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={goToPrevAd}
                            disabled={state.currentAdIndex === 0}
                            className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-400" />
                        </button>
                        <span className="text-xs text-gray-400 font-medium">
                            {state.currentAdIndex + 1} / {state.ads.length}
                        </span>
                        <button
                            onClick={goToNextAd}
                            disabled={state.currentAdIndex === state.ads.length - 1}
                            className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                )}
            </div>

            {/* Ad Name Input - More prominent */}
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-amber-400 font-medium">{t('captain.preview_ad_name')}</label>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={duplicateAd}
                            className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-amber-400"
                            title={t('captain.duplicate_ad')}
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        {state.ads.length > 1 && (
                            <button
                                onClick={deleteAd}
                                className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-red-400"
                                title={t('captain.delete_ad')}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
                <input
                    type="text"
                    value={currentAd.adName}
                    onChange={(e) => dispatch({
                        type: 'UPDATE_CURRENT_AD',
                        updates: { adName: e.target.value }
                    })}
                    placeholder={t('captain.placeholder_ad_name')}
                    className="w-full bg-gray-900 border border-amber-500/30 rounded-lg px-3 py-2 text-base text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
            </div>

            {/* Facebook-style Ad Preview Card */}
            <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                {/* Page header */}
                <div className="p-3 flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        P
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">Your Page</div>
                        <div className="text-xs text-gray-500">Sponsored</div>
                    </div>
                </div>

                {/* Post text (body) */}
                {currentAd.body && (
                    <div className="px-3 pb-2">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{currentAd.body}</p>
                    </div>
                )}

                {/* Media preview */}
                <div className="aspect-square bg-gray-100 relative">
                    {currentAd.previewUrl ? (
                        currentAd.file?.type?.startsWith('video/') ? (
                            <video
                                src={currentAd.previewUrl}
                                className="w-full h-full object-cover"
                                muted
                            />
                        ) : (
                            <img
                                src={currentAd.previewUrl}
                                alt="Ad preview"
                                className="w-full h-full object-cover"
                            />
                        )
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                            <ImageIcon className="w-12 h-12 mb-2" />
                            <span className="text-sm">{t('captain.preview_no_image')}</span>
                        </div>
                    )}
                </div>

                {/* Link preview bar */}
                <div className="bg-gray-100 px-3 py-2 border-t border-gray-200">
                    {currentAd.link ? (
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500 uppercase truncate">
                                    {(() => {
                                        try {
                                            return new URL(currentAd.link).hostname;
                                        } catch {
                                            return currentAd.link;
                                        }
                                    })()}
                                </div>
                                <div className="text-sm font-semibold text-gray-900 truncate">
                                    {currentAd.title || 'Headline'}
                                </div>
                            </div>
                            {currentAd.cta && (
                                <button className="ml-2 px-3 py-1.5 bg-gray-200 text-sm font-semibold text-gray-700 rounded">
                                    {CTA_DISPLAY[currentAd.cta] || currentAd.cta}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-gray-900 truncate flex-1">
                                {currentAd.title || 'Headline will appear here'}
                            </div>
                            {currentAd.cta && (
                                <button className="ml-2 px-3 py-1.5 bg-gray-200 text-sm font-semibold text-gray-700 rounded">
                                    {CTA_DISPLAY[currentAd.cta] || currentAd.cta}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Engagement buttons */}
                <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between text-gray-500 text-sm">
                    <button className="flex items-center gap-1 hover:text-blue-500">
                        <ThumbsUp className="w-4 h-4" />
                        Like
                    </button>
                    <button className="flex items-center gap-1 hover:text-blue-500">
                        <MessageCircle className="w-4 h-4" />
                        Comment
                    </button>
                    <button className="flex items-center gap-1 hover:text-blue-500">
                        <Share2 className="w-4 h-4" />
                        Share
                    </button>
                </div>
            </div>

            {/* Link URL display */}
            {currentAd.link && (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">{currentAd.link}</span>
                </div>
            )}
        </div>
    );
};

export default AdPreviewPanel;
