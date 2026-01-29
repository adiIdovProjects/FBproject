"use client";

/**
 * RecommendationsTab Component
 * Shows static Facebook best practices + AI-powered recommendations.
 * Embedded inside Campaign Control as a tab.
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, ChevronDown, ChevronRight, Lightbulb, Loader2 } from 'lucide-react';
import PrioritizedRecommendations from '../insights/PrioritizedRecommendations';
import { fetchInsightsSummary, InsightItem } from '../../services/insights.service';
import { formatDate, calculateDateRange } from '../../utils/date';

interface RecommendationsTabProps {
  accountId: string;
}

// Simple collapsible Q&A item for best practices
function BestPracticeItem({ question, children, isRTL }: { question: string; children: React.ReactNode; isRTL: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />}
        <h4 className={`flex-1 font-semibold text-white text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{question}</h4>
      </button>
      {isOpen && (
        <div className={`px-4 pb-4 border-t border-white/10 pt-3 ${isRTL ? 'text-right' : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300 mt-2">
      <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
      <span>{children}</span>
    </div>
  );
}

export default function RecommendationsTab({ accountId }: RecommendationsTabProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';

  // AI recommendations state
  const [recommendations, setRecommendations] = useState<InsightItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  // Fetch AI recommendations
  useEffect(() => {
    const fetchRecs = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const dateRange = calculateDateRange('last_30_days');
        const items = await fetchInsightsSummary(
          { startDate: formatDate(dateRange.start) || '', endDate: formatDate(dateRange.end) || '' },
          'campaigns',
          undefined,
          accountId,
          locale
        );
        setRecommendations(items);
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    if (accountId) fetchRecs();
  }, [accountId, locale]);

  return (
    <div className="max-w-4xl" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Section 1: Static Best Practices */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-accent/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {t('campaign_control.best_practices_title')}
            </h2>
            <p className="text-sm text-gray-400">
              {t('campaign_control.best_practices_subtitle')}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <BestPracticeItem question={t('learning.objective_title')} isRTL={isRTL}>
            <p className="text-gray-300 text-sm">{t('learning.objective_tip')}</p>
            <TipBox>{t('learning.objective_tip_box')}</TipBox>
          </BestPracticeItem>

          <BestPracticeItem question={t('learning.ads_per_adset_title')} isRTL={isRTL}>
            <p className="text-gray-300 text-sm">{t('learning.ads_per_adset')}</p>
            <TipBox>{t('learning.ads_per_adset_tip')}</TipBox>
          </BestPracticeItem>

          <BestPracticeItem question={t('learning.campaign_vs_adset_title')} isRTL={isRTL}>
            <p className="text-gray-300 text-sm">{t('learning.new_campaign_vs_adset')}</p>
          </BestPracticeItem>

          <BestPracticeItem question={t('learning.budget_title')} isRTL={isRTL}>
            <div className="space-y-2 text-sm">
              <p className="text-gray-300"><span className="text-green-400 font-medium">Testing:</span> {t('learning.budget_testing')}</p>
              <p className="text-gray-300"><span className="text-blue-400 font-medium">Scaling:</span> {t('learning.budget_scaling')}</p>
            </div>
          </BestPracticeItem>

          <BestPracticeItem question={t('learning.when_to_pause_title')} isRTL={isRTL}>
            <p className="text-gray-300 text-sm">{t('learning.when_to_pause')}</p>
          </BestPracticeItem>
        </div>
      </div>

      {/* Section 2: AI Recommendations */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Lightbulb className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {t('campaign_control.ai_recommendations_title')}
            </h2>
            <p className="text-sm text-gray-400">
              {t('campaign_control.ai_recommendations_subtitle')}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-3 p-6 bg-gray-800/50 rounded-xl border border-gray-700">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span className="text-gray-400">{t('campaign_control.ai_recommendations_loading')}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 text-sm">
            {t('campaign_control.ai_recommendations_error')}
          </div>
        )}

        {!isLoading && !error && recommendations.length === 0 && (
          <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700 text-gray-400 text-sm text-center">
            {t('campaign_control.no_recommendations')}
          </div>
        )}

        {!isLoading && !error && recommendations.length > 0 && (
          <PrioritizedRecommendations items={recommendations} isRTL={isRTL} />
        )}
      </div>
    </div>
  );
}
