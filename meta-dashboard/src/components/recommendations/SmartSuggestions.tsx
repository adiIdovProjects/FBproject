'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Target, MessageSquare, Palette, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface AudienceRecommendations {
  interests: string[];
  age_range: { min: number; max: number };
  genders: string[];
  countries: string[];
  languages?: string[];
  rationale: string;
}

interface AdCopyVariant {
  headline: string;
  primary_text: string;
  description: string;
  cta: string;
}

interface AdCopyRecommendations {
  variants: AdCopyVariant[];
  tips: string[];
}

interface CreativeDirection {
  visual_style: string;
  content_angles: string[];
  ad_formats: string[];
  messaging_themes: string[];
  best_practices: string[];
}

type TabType = 'audience' | 'ad-copy' | 'creative';

interface SmartSuggestionsProps {
  accountId: string;
  objective?: string;
  onApplyAudience?: (recommendations: AudienceRecommendations) => void;
  onApplyAdCopy?: (variant: AdCopyVariant) => void;
}

export function SmartSuggestions({
  accountId,
  objective = 'SALES',
  onApplyAudience,
  onApplyAdCopy
}: SmartSuggestionsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ad-copy');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [audienceRecs, setAudienceRecs] = useState<AudienceRecommendations | null>(null);
  const [adCopyRecs, setAdCopyRecs] = useState<AdCopyRecommendations | null>(null);
  const [creativeRecs, setCreativeRecs] = useState<CreativeDirection | null>(null);

  useEffect(() => {
    // Auto-load recommendations based on active tab
    if (activeTab === 'audience' && !audienceRecs) {
      loadAudienceRecommendations();
    } else if (activeTab === 'ad-copy' && !adCopyRecs) {
      loadAdCopyRecommendations();
    } else if (activeTab === 'creative' && !creativeRecs) {
      loadCreativeRecommendations();
    }
  }, [activeTab, accountId]);

  const loadAudienceRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/api/v1/accounts/${accountId}/recommendations/audience`);
      setAudienceRecs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load audience recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdCopyRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/api/v1/accounts/${accountId}/recommendations/ad-copy`, {
        params: { objective }
      });
      setAdCopyRecs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load ad copy recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCreativeRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/api/v1/accounts/${accountId}/recommendations/creative-direction`);
      setCreativeRecs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load creative recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10">
        <button
          onClick={() => setActiveTab('ad-copy')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'ad-copy'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Ad Copy
        </button>
        <button
          onClick={() => setActiveTab('audience')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'audience'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Audience
        </button>
        <button
          onClick={() => setActiveTab('creative')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'creative'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4 inline mr-2" />
          Creative
        </button>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-200 font-medium">Error</p>
            <p className="text-red-300/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Ad Copy Tab */}
      {activeTab === 'ad-copy' && adCopyRecs && !isLoading && (
        <div className="space-y-4">
          {adCopyRecs.variants.map((variant, index) => (
            <div
              key={index}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-purple-400/30 transition-colors"
            >
              <div className="mb-3">
                <span className="text-xs font-semibold text-purple-400 uppercase">Variant {index + 1}</span>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Headline</label>
                  <p className="text-white font-medium">{variant.headline}</p>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Primary Text</label>
                  <p className="text-gray-300 text-sm">{variant.primary_text}</p>
                </div>

                {variant.description && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Description</label>
                    <p className="text-gray-300 text-sm">{variant.description}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Call to Action</label>
                  <span className="inline-block bg-purple-500/20 text-purple-300 text-xs px-3 py-1 rounded-full">
                    {variant.cta}
                  </span>
                </div>
              </div>

              {onApplyAdCopy && (
                <button
                  onClick={() => onApplyAdCopy(variant)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Use This Copy
                </button>
              )}
            </div>
          ))}

          {adCopyRecs.tips && adCopyRecs.tips.length > 0 && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mt-4">
              <p className="text-blue-300 font-medium text-sm mb-2">💡 Tips</p>
              <ul className="space-y-1">
                {adCopyRecs.tips.map((tip, i) => (
                  <li key={i} className="text-blue-200 text-sm">• {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Audience Tab */}
      {activeTab === 'audience' && audienceRecs && !isLoading && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-2">Interests</label>
                <div className="flex flex-wrap gap-2">
                  {audienceRecs.interests.map((interest, i) => (
                    <span
                      key={i}
                      className="bg-purple-500/20 text-purple-300 text-xs px-3 py-1 rounded-full"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">Age Range</label>
                <span className="text-white">
                  {audienceRecs.age_range.min} - {audienceRecs.age_range.max} years old
                </span>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">Countries</label>
                <div className="flex flex-wrap gap-2">
                  {audienceRecs.countries.map((country, i) => (
                    <span
                      key={i}
                      className="bg-green-500/20 text-green-300 text-xs px-3 py-1 rounded-full"
                    >
                      {country}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mt-4">
                <p className="text-blue-300 text-sm">{audienceRecs.rationale}</p>
              </div>
            </div>

            {onApplyAudience && (
              <button
                onClick={() => onApplyAudience(audienceRecs)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors mt-4"
              >
                Apply These Targeting Settings
              </button>
            )}
          </div>
        </div>
      )}

      {/* Creative Tab */}
      {activeTab === 'creative' && creativeRecs && !isLoading && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-2">Visual Style</label>
                <p className="text-white text-sm">{creativeRecs.visual_style}</p>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">Content Angles</label>
                <ul className="space-y-1">
                  {creativeRecs.content_angles.map((angle, i) => (
                    <li key={i} className="text-gray-300 text-sm">• {angle}</li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">Recommended Ad Formats</label>
                <div className="flex flex-wrap gap-2">
                  {creativeRecs.ad_formats.map((format, i) => (
                    <span
                      key={i}
                      className="bg-purple-500/20 text-purple-300 text-xs px-3 py-1 rounded-full"
                    >
                      {format}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">Messaging Themes</label>
                <div className="flex flex-wrap gap-2">
                  {creativeRecs.messaging_themes.map((theme, i) => (
                    <span
                      key={i}
                      className="bg-blue-500/20 text-blue-300 text-xs px-3 py-1 rounded-full"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-300 font-medium text-sm mb-2">✓ Best Practices</p>
                <ul className="space-y-1">
                  {creativeRecs.best_practices.map((practice, i) => (
                    <li key={i} className="text-green-200 text-sm">• {practice}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
