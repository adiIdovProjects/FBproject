"use client";

/**
 * AI Insights Page
 * Comprehensive AI-powered insights with historical trends, creative analysis, and ad fatigue detection
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Lightbulb, TrendingUp, Palette, AlertTriangle } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import DateFilter from '../../../components/DateFilter';
import InsightsSection from '../../../components/insights/InsightsSection';
import PrioritizedRecommendations from '../../../components/insights/PrioritizedRecommendations';
import HistoricalTrendsView from '../../../components/insights/HistoricalTrendsView';
import CreativeAnalysisView from '../../../components/insights/CreativeAnalysisView';
import CampaignAnalysisView from '../../../components/insights/CampaignAnalysisView';
import AIChat from '../../../components/insights/AIChat';

// Services & Types
import { fetchDeepInsights, DeepInsightsResponse } from '../../../services/insights.service';

// Utilities
import { formatDate, calculateDateRange } from '../../../utils/date';

const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

type TabKey = 'overview' | 'trends' | 'creatives' | 'fatigue';

export default function InsightsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';
  const searchParams = useSearchParams();
  const accountId = searchParams.get('account_id') || undefined;

  // Tab state
  type TabKey = 'overview' | 'campaigns' | 'trends' | 'creatives';
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Initialize date range
  const initialDates = useMemo(() => calculateDateRange(DEFAULT_DATE_RANGE_KEY), []);
  const [startDate, setStartDate] = useState<string>(
    formatDate(initialDates.start) || formatDate(new Date()) || ''
  );
  const [endDate, setEndDate] = useState<string>(
    formatDate(initialDates.end) || formatDate(new Date()) || ''
  );

  // Data state
  const [deepInsights, setDeepInsights] = useState<DeepInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialChatQuery, setInitialChatQuery] = useState<string | undefined>(undefined);

  const openChat = (query?: string) => {
    if (query) setInitialChatQuery(query);
    setIsChatOpen(true);
  };


  // Fetch deep insights (for Overview tab)
  useEffect(() => {
    if (activeTab !== 'overview') return;

    const fetchData = async () => {
      if (!startDate || !endDate) return;

      setIsLoading(true);
      setError(null);

      try {
        const dateRange = { startDate, endDate };
        const data = await fetchDeepInsights(dateRange, accountId, locale);
        setDeepInsights(data);
      } catch (err: any) {
        console.error('[Insights Page] Error fetching insights:', err);
        setError(err.message || 'Failed to fetch insights');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, activeTab, accountId]);

  // Handle date range change
  const handleDateRangeChange = (start: string | null, end: string | null) => {
    if (start) setStartDate(start);
    if (end) setEndDate(end);
  };

  // Tab configuration
  const tabs = [
    {
      key: 'overview' as TabKey,
      label: t('insights.overview'),
      icon: Lightbulb,
      description: t('insights.overview_desc')
    },
    {
      key: 'trends' as TabKey,
      label: t('insights.historical_trends'),
      icon: TrendingUp,
      description: t('insights.historical_trends_desc')
    },
    {
      key: 'campaigns' as TabKey,
      label: t('insights.campaign_analysis'),
      icon: TrendingUp, // Reusing TrendingUp or finding another icon
      description: t('insights.campaign_analysis_desc')
    },
    {
      key: 'creatives' as TabKey,
      label: t('insights.creative_analysis'),
      icon: Palette,
      description: t('insights.creative_analysis_desc')
    }
  ];

  return (
    <MainLayout
      title={t('insights.title')}
      description={t('insights.subtitle')}
    >
      {/* Date Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
          lang={locale as any}
          t={t}
          isRTL={isRTL}
        />
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-border-subtle">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                  ${isActive
                    ? 'border-primary-light text-primary-light bg-primary-dark/10'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-card-bg/50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">{tab.label}</div>
                  <div className="text-xs opacity-75">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-400 text-red-300 rounded-xl">
                <p className="font-bold">{t('insights.error_loading')}</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
                    <div className="h-6 w-48 bg-gray-700 rounded animate-pulse mb-4"></div>
                    <div className="space-y-3">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="h-4 bg-gray-700 rounded animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Insights Content */}
            {!isLoading && deepInsights && (
              <>
                {/* Executive Summary Card */}
                {deepInsights.executive_summary && (
                  <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-xl p-6 mb-8 shadow-lg">
                    <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Lightbulb className="w-6 h-6 text-indigo-400" />
                      <h2 className="text-2xl font-bold text-indigo-200">{t('insights.executive_summary')}</h2>
                    </div>
                    <p className={`text-gray-200 leading-relaxed text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                      {deepInsights.executive_summary}
                    </p>
                  </div>
                )}

                {/* Key Findings Section */}
                <InsightsSection
                  title={t('insights.key_findings')}
                  items={deepInsights.key_findings}
                  isRTL={isRTL}
                  onInvestigate={openChat}
                />

                {/* Performance Trends Section */}
                <InsightsSection
                  title={t('insights.performance_trends')}
                  items={deepInsights.performance_trends}
                  isRTL={isRTL}
                  onInvestigate={openChat}
                />

                {/* Strategic Recommendations Section */}
                <PrioritizedRecommendations
                  items={deepInsights.recommendations}
                  isRTL={isRTL}
                  onInvestigate={openChat}
                />

                {/* Opportunities Section */}
                <InsightsSection
                  title={t('insights.opportunities')}
                  items={deepInsights.opportunities}
                  isRTL={isRTL}
                  onInvestigate={openChat}
                />

                {/* Generated Timestamp */}
                {deepInsights.generated_at && (
                  <div className={`mt-8 text-center text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    ✨ {t('insights.generated_at')} {new Date(deepInsights.generated_at).toLocaleString(locale)}
                  </div>
                )}
              </>
            )}

            {/* Empty State */}
            {!isLoading && !deepInsights && !error && (
              <div className="text-center py-12">
                <Lightbulb className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">{t('insights.no_insights')}</p>
              </div>
            )}
          </>
        )}

        {/* Historical Trends Tab */}
        {activeTab === 'trends' && (
          <HistoricalTrendsView
            startDate={startDate}
            endDate={endDate}
            isRTL={isRTL}
          />
        )}

        {/* Campaign Analysis Tab */}
        {activeTab === 'campaigns' && (
          <CampaignAnalysisView
            startDate={startDate}
            endDate={endDate}
            isRTL={isRTL}
            accountId={accountId}
          />
        )}

        {/* Creative Analysis Tab */}
        {activeTab === 'creatives' && (
          <CreativeAnalysisView
            startDate={startDate}
            endDate={endDate}
            isRTL={isRTL}
          />
        )}

      </div>


      {/* Floating Action Button for AI Chat */}
      <button
        onClick={() => openChat()}
        className="fixed bottom-8 right-8 bg-accent hover:bg-accent/90 text-white p-4 rounded-full shadow-2xl z-30 transition-all hover:scale-105 group"
      >
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-[#131620]"></div>
        <Lightbulb className="w-8 h-8 group-hover:rotate-12 transition-transform" />
        <span className="sr-only">Ask AI Investigator</span>
      </button>

      {/* AI Chat Drawer */}
      <AIChat
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setInitialChatQuery(undefined);
        }}
        context={{
          startDate,
          endDate,
          page: 'insights',
          accountId
        }}
        accountId={accountId}
        initialQuery={initialChatQuery}
      />
    </MainLayout >
  );
}
