"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Send, Sparkles, Eye, Check, Loader2 } from 'lucide-react';

interface CopySuggestion {
  headline: string;
  body: string;
}

interface AICopyStepProps {
  adIndex: number;
  totalAds: number;
  creative: File | null;
  previewUrl: string | null;
  currentHeadline: string;
  currentBody: string;
  suggestions: CopySuggestion[];
  isLoadingSuggestions: boolean;
  onSelect: (headline: string, body: string) => void;
  onGuideAI: (prompt: string) => void;
  onApplyToAll: (headline: string, body: string) => void;
  onSeePreview: () => void;
  onNext: () => void;
  onBack: () => void;
  isRTL?: boolean;
}

export const AICopyStep: React.FC<AICopyStepProps> = ({
  adIndex,
  totalAds,
  creative,
  previewUrl,
  currentHeadline,
  currentBody,
  suggestions,
  isLoadingSuggestions,
  onSelect,
  onGuideAI,
  onApplyToAll,
  onSeePreview,
  onNext,
  onBack,
  isRTL = false,
}) => {
  const t = useTranslations();
  const [guideText, setGuideText] = useState('');
  const [customHeadline, setCustomHeadline] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [applyToAll, setApplyToAll] = useState(false);

  // Reset custom fields when ad changes
  useEffect(() => {
    setCustomHeadline(currentHeadline || '');
    setCustomBody(currentBody || '');
    setApplyToAll(false);
  }, [adIndex, currentHeadline, currentBody]);

  const handleGuideSubmit = () => {
    if (guideText.trim()) {
      onGuideAI(guideText.trim());
      setGuideText('');
    }
  };

  const handleUseCustom = () => {
    if (customHeadline.trim() && customBody.trim()) {
      if (applyToAll) {
        onApplyToAll(customHeadline.trim(), customBody.trim());
      } else {
        onSelect(customHeadline.trim(), customBody.trim());
      }
    }
  };

  const handleUseSuggestion = (suggestion: CopySuggestion) => {
    if (applyToAll) {
      onApplyToAll(suggestion.headline, suggestion.body);
    } else {
      onSelect(suggestion.headline, suggestion.body);
    }
  };

  const progressPercent = ((adIndex + 1) / totalAds) * 100;
  const isLastAd = adIndex === totalAds - 1;
  const hasValidCustomCopy = customHeadline.trim().length > 0 && customBody.trim().length > 0;

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-300">
          {t('captain.ad_x_of_y', { current: adIndex + 1, total: totalAds })}
        </span>
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Creative preview with text overlay */}
      <div className="relative rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
        {previewUrl ? (
          <div className="aspect-video max-h-64 overflow-hidden">
            {creative?.type.startsWith('video/') ? (
              <video
                src={previewUrl}
                className="w-full h-full object-cover"
                muted
              />
            ) : (
              <img
                src={previewUrl}
                alt={`Creative ${adIndex + 1}`}
                className="w-full h-full object-cover"
              />
            )}
            {/* Text overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-white font-semibold text-lg line-clamp-1">
                {currentHeadline || customHeadline || t('captain.headline_preview')}
              </p>
              <p className="text-gray-300 text-sm line-clamp-2 mt-1">
                {currentBody || customBody || t('captain.body_preview')}
              </p>
            </div>
          </div>
        ) : (
          <div className="aspect-video max-h-64 flex items-center justify-center">
            <p className="text-gray-500">{t('captain.no_preview')}</p>
          </div>
        )}

        {/* See Preview button */}
        <button
          onClick={onSeePreview}
          className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-sm rounded-lg backdrop-blur-sm transition-colors"
        >
          <Eye className="w-4 h-4" />
          {t('captain.see_preview')}
        </button>

        {/* Thumbnail strip */}
        <div className="absolute top-3 left-3 flex gap-1">
          {Array.from({ length: totalAds }).map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-md border-2 flex items-center justify-center text-xs font-medium transition-all ${
                i === adIndex
                  ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                  : i < adIndex
                  ? 'border-green-500 bg-green-500/20 text-green-400'
                  : 'border-gray-600 bg-gray-800/80 text-gray-500'
              }`}
            >
              {i < adIndex ? <Check className="w-4 h-4" /> : i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-gray-300">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span className="font-medium">{t('captain.ai_suggestions')}</span>
        </div>

        {isLoadingSuggestions ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-gray-700 bg-gray-800/50 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-amber-400 text-sm mb-1">
                      {t('captain.option')} {String.fromCharCode(65 + index)}
                    </p>
                    <p className="text-white font-semibold">{suggestion.headline}</p>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">{suggestion.body}</p>
                  </div>
                  <button
                    onClick={() => handleUseSuggestion(suggestion)}
                    className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium rounded-lg transition-all"
                  >
                    {t('captain.use_this')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">{t('captain.no_suggestions')}</p>
        )}
      </div>

      {/* Guide AI */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400 flex items-center gap-2">
          <span>💬</span>
          {t('captain.guide_ai')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={guideText}
            onChange={(e) => setGuideText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGuideSubmit()}
            placeholder={t('captain.guide_ai_placeholder')}
            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          <button
            onClick={handleGuideSubmit}
            disabled={!guideText.trim()}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-gray-500 text-sm">{t('captain.or_write_your_own')}</span>
        <div className="flex-1 h-px bg-gray-700" />
      </div>

      {/* Custom input */}
      <div className="space-y-3">
        <input
          type="text"
          value={customHeadline}
          onChange={(e) => setCustomHeadline(e.target.value)}
          placeholder={t('captain.placeholder_headline')}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
        <textarea
          value={customBody}
          onChange={(e) => setCustomBody(e.target.value)}
          placeholder={t('captain.placeholder_body')}
          rows={3}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
        />

        <button
          onClick={handleUseCustom}
          disabled={!hasValidCustomCopy}
          className="w-full py-2.5 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium rounded-lg transition-colors"
        >
          {t('captain.use_my_copy')}
        </button>
      </div>

      {/* Apply to all checkbox */}
      {totalAds > 1 && (
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={applyToAll}
            onChange={(e) => setApplyToAll(e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
          />
          <span className="text-gray-300 group-hover:text-white transition-colors">
            {t('captain.use_for_all_remaining')}
          </span>
        </label>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-800">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-gray-400 hover:text-white transition-colors"
        >
          ← {t('captain.back')}
        </button>
        <button
          onClick={onNext}
          disabled={!currentHeadline && !customHeadline.trim()}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-all"
        >
          {isLastAd ? t('captain.continue_to_link') : t('captain.next_ad')} →
        </button>
      </div>
    </div>
  );
};
