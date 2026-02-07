'use client';

import React, { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

interface AdCopyVariant {
  headline: string;
  primary_text: string;
  description?: string;
  cta?: string;
}

interface AICopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (variant: AdCopyVariant) => void;
  accountId: string;
  objective: string;
  fieldType: 'headline' | 'body';
}

export function AICopyModal({ isOpen, onClose, onSelect, accountId, objective, fieldType }: AICopyModalProps) {
  const t = useTranslations('captain');
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [variants, setVariants] = useState<AdCopyVariant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { modalRef, handleKeyDown } = useModalAccessibility(isOpen, onClose);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/accounts/${accountId}/recommendations/ad-copy?objective=${objective}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate copy');
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error === 'No business profile found'
          ? t('no_business_profile')
          : t('ai_copy_error'));
      } else if (data.variants && data.variants.length > 0) {
        setVariants(data.variants);
      } else {
        setError(t('ai_copy_error'));
      }
    } catch (err) {
      console.error('Failed to generate AI copy:', err);
      setError(t('ai_copy_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVariant = (variant: AdCopyVariant) => {
    onSelect(variant);
    onClose();
    // Reset state
    setContext('');
    setVariants([]);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-copy-modal-title"
        onKeyDown={handleKeyDown}
        className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <h2 id="ai-copy-modal-title" className="text-xl font-semibold text-white">{t('ai_copy_modal_title')}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close') || 'Close'}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Context input (optional) */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              {t('ai_copy_context_label')}
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={t('ai_copy_context_placeholder')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add context to get more specific suggestions (e.g., "Black Friday sale")
            </p>
          </div>

          {/* Generate button */}
          {variants.length === 0 && (
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('generating')}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {t('generate_copy')}
                </>
              )}
            </button>
          )}

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Variants */}
          {variants.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                Click on an option to use it:
              </p>
              {variants.map((variant, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectVariant(variant)}
                  className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-amber-500 text-left transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs text-gray-500">Option {index + 1}</span>
                    <span className="text-xs text-amber-400">{t('use_this_copy')}</span>
                  </div>
                  {fieldType === 'headline' ? (
                    <p className="text-white font-medium">{variant.headline}</p>
                  ) : (
                    <>
                      <p className="text-white font-medium mb-1">{variant.headline}</p>
                      <p className="text-gray-300 text-sm">{variant.primary_text}</p>
                    </>
                  )}
                  {variant.description && (
                    <p className="text-gray-400 text-xs mt-2">{variant.description}</p>
                  )}
                </button>
              ))}

              {/* Regenerate button */}
              <button
                onClick={() => {
                  setVariants([]);
                  handleGenerate();
                }}
                className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Generate Different Options
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
