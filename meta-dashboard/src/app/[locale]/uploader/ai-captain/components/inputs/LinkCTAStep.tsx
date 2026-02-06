"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link2, Check, AlertCircle } from 'lucide-react';

export interface Ad {
  id: string;
  previewUrl: string | null;
  headline: string;
  body: string;
}

interface LinkCTAStepProps {
  ads: Ad[];
  initialLink?: string;
  initialCta?: string;
  onSubmit: (link: string, cta: string) => void;
  onBack: () => void;
  isRTL?: boolean;
}

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'GET_OFFER', label: 'Get Offer' },
  { value: 'BOOK_NOW', label: 'Book Now' },
];

export const LinkCTAStep: React.FC<LinkCTAStepProps> = ({
  ads,
  initialLink = '',
  initialCta = 'LEARN_MORE',
  onSubmit,
  onBack,
  isRTL = false,
}) => {
  const t = useTranslations();
  const [link, setLink] = useState(initialLink);
  const [cta, setCta] = useState(initialCta);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Auto-fix URL on blur
  const handleLinkBlur = () => {
    let trimmed = link.trim();
    if (trimmed && !trimmed.match(/^https?:\/\//)) {
      trimmed = `https://${trimmed}`;
      setLink(trimmed);
    }
    validateLink(trimmed);
  };

  const validateLink = (url: string) => {
    if (!url.trim()) {
      setLinkError(t('captain.link_required'));
      return false;
    }
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setLinkError(t('captain.link_invalid_protocol'));
        return false;
      }
      setLinkError(null);
      return true;
    } catch {
      setLinkError(t('captain.link_invalid'));
      return false;
    }
  };

  const handleSubmit = () => {
    let finalLink = link.trim();
    if (!finalLink.match(/^https?:\/\//)) {
      finalLink = `https://${finalLink}`;
    }

    if (validateLink(finalLink)) {
      onSubmit(finalLink, cta);
    }
  };

  const isValid = link.trim().length > 0 && !linkError;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
          <Link2 className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            {t('captain.where_should_clicks_go')}
          </h3>
          <p className="text-sm text-gray-400">
            {t('captain.link_cta_description')}
          </p>
        </div>
      </div>

      {/* Ads preview strip */}
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <p className="text-sm text-gray-400 mb-3">
          {t('captain.your_ads', { count: ads.length })}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {ads.map((ad, index) => (
            <div
              key={ad.id}
              className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-green-500 relative"
            >
              {ad.previewUrl ? (
                <img
                  src={ad.previewUrl}
                  alt={`Ad ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500 text-xs">
                  {index + 1}
                </div>
              )}
              <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-green-400 mt-2">
          ✓ {t('captain.all_have_copy')}
        </p>
      </div>

      {/* Link input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          {t('captain.link_url')}
        </label>
        <input
          type="text"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            if (linkError) validateLink(e.target.value);
          }}
          onBlur={handleLinkBlur}
          placeholder="example.com/shop"
          className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-colors ${
            linkError
              ? 'border-red-500 focus:border-red-500'
              : 'border-gray-700 focus:border-amber-500'
          }`}
        />
        {linkError && (
          <p className="flex items-center gap-1.5 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" />
            {linkError}
          </p>
        )}
        <p className="text-xs text-gray-500">
          {t('captain.link_hint')}
        </p>
      </div>

      {/* CTA select */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          {t('captain.button_text')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CTA_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setCta(option.value)}
              className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                cta === option.value
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Apply to all note */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-400">
          ℹ️ {t('captain.will_apply_to_all', { count: ads.length })}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-800">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-gray-400 hover:text-white transition-colors"
        >
          ← {t('captain.back')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-all"
        >
          {t('captain.review_ads')} →
        </button>
      </div>
    </div>
  );
};
