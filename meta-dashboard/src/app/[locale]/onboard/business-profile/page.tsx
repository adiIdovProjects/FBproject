'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Globe, Loader2, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { fetchLinkedAccounts, AdAccount } from '@/services/accounts.service';

interface AccountProfile {
  accountId: string;
  accountName: string;
  websiteUrl: string;
  businessDescription: string;
  noWebsite: boolean;
  status: 'idle' | 'saving' | 'analyzing' | 'completed' | 'failed';
}

export default function BusinessProfilePage() {
  const router = useRouter();
  const { locale } = useParams();
  const t = useTranslations('business_profile');

  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const linked = await fetchLinkedAccounts();
      setAccounts(linked);
      setProfiles(
        linked.map((acc) => ({
          accountId: acc.account_id,
          accountName: acc.name,
          websiteUrl: '',
          businessDescription: '',
          noWebsite: false,
          status: 'idle',
        }))
      );
    } catch (err) {
      console.error('Failed to load accounts', err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentProfile = profiles[currentIndex];

  const updateProfile = (field: keyof AccountProfile, value: string | boolean) => {
    setProfiles((prev) =>
      prev.map((p, i) => (i === currentIndex ? { ...p, [field]: value } : p))
    );
  };

  const isValid = () => {
    if (!currentProfile) return false;
    if (currentProfile.noWebsite) {
      return currentProfile.businessDescription.trim().length > 0;
    }
    return currentProfile.websiteUrl.trim().length > 0;
  };

  const handleContinue = async () => {
    if (!currentProfile || !isValid()) return;

    updateProfile('status', 'saving');

    try {
      // Save business profile
      await apiClient.post(`/api/v1/accounts/${currentProfile.accountId}/business-profile`, {
        website_url: currentProfile.noWebsite ? null : currentProfile.websiteUrl.trim(),
        business_description: currentProfile.noWebsite ? currentProfile.businessDescription.trim() : null,
      });

      updateProfile('status', 'analyzing');

      // Don't wait for analysis to complete - move to next account or quiz
      if (currentIndex < profiles.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // All accounts done - go to profile quiz
        router.push(`/${locale}/quiz`);
      }
    } catch (err) {
      console.error('Failed to save business profile', err);
      updateProfile('status', 'failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!currentProfile) {
    router.push(`/${locale}/quiz`);
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0F1115] py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Step indicator */}
        {profiles.length > 1 && (
          <div className="text-center mb-4">
            <span className="text-gray-500 text-sm">
              {t('step_indicator', { current: currentIndex + 1, total: profiles.length })}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
          <p className="text-gray-400">{t('subtitle')}</p>
        </div>

        {/* Account name */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="mb-6">
            <span className="text-gray-400 text-sm">
              {t('account_label', { name: currentProfile.accountName })}
            </span>
          </div>

          {/* Website URL input */}
          {!currentProfile.noWebsite && (
            <div className="mb-4">
              <label className="block text-white text-sm font-medium mb-2">
                {t('website_url_label')}
              </label>
              <input
                type="url"
                value={currentProfile.websiteUrl}
                onChange={(e) => updateProfile('websiteUrl', e.target.value)}
                placeholder={t('website_url_placeholder')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-colors"
              />
              <p className="text-gray-500 text-xs mt-2">{t('website_url_help')}</p>
            </div>
          )}

          {/* No website toggle */}
          <button
            onClick={() => updateProfile('noWebsite', !currentProfile.noWebsite)}
            className="text-sm text-gray-400 hover:text-accent transition-colors mb-4"
          >
            {t('no_website')}
          </button>

          {/* Business description (shown only when no website) */}
          {currentProfile.noWebsite && (
            <div className="mb-4 mt-2">
              <label className="block text-white text-sm font-medium mb-2">
                {t('description_label')}
              </label>
              <input
                type="text"
                value={currentProfile.businessDescription}
                onChange={(e) => updateProfile('businessDescription', e.target.value)}
                placeholder={t('description_placeholder')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-colors"
              />
              <p className="text-gray-500 text-xs mt-2">{t('description_help')}</p>
            </div>
          )}

          {/* Status messages */}
          {currentProfile.status === 'failed' && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm mb-4">
              <AlertCircle className="w-4 h-4" />
              <span>{t('analysis_failed')}</span>
            </div>
          )}

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!isValid() || currentProfile.status === 'saving'}
            className="w-full mt-6 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {currentProfile.status === 'saving' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('analyzing')}
              </>
            ) : (
              <>
                {t('continue')}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Progress dots for multiple accounts */}
        {profiles.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {profiles.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIndex
                    ? 'bg-accent'
                    : i < currentIndex
                    ? 'bg-accent/40'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
