"use client";

/**
 * AI Insights Page
 * Comprehensive AI-powered insights with historical trends, creative analysis, and ad fatigue detection
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Lightbulb, TrendingUp, Palette, AlertTriangle, HelpCircle } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import HistoricalTrendsView from '../../../components/insights/HistoricalTrendsView';
import CreativeAnalysisView from '../../../components/insights/CreativeAnalysisView';
import CampaignAnalysisView from '../../../components/insights/CampaignAnalysisView';
import AIChat from '../../../components/insights/AIChat';
import OverviewInsights from '../../../components/insights/OverviewInsights';
import ImprovementChecks from '../../../components/insights/ImprovementChecks';
import InsightsSummary from '../../../components/insights/InsightsSummary';

// Services & Types
import { fetchOverviewSummary, OverviewSummaryResponse } from '../../../services/insights.service';

// Context
import { useAccount } from '../../../context/AccountContext';

// Utilities
import { formatDate, calculateDateRange } from '../../../utils/date';

const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

type TabKey = 'overview' | 'trends' | 'creatives' | 'fatigue';

export default function InsightsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';
  const { selectedAccountId } = useAccount();
  const accountId = selectedAccountId || undefined;

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

  // Data state for Overview tab (new overview summary)
  const [overviewData, setOverviewData] = useState<OverviewSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialChatQuery, setInitialChatQuery] = useState<string | undefined>(undefined);

  const openChat = (query?: string) => {
    if (query) setInitialChatQuery(query);
    setIsChatOpen(true);
  };


  // Fetch overview summary (for Overview tab) - no date filter needed
  useEffect(() => {
    if (activeTab !== 'overview') return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchOverviewSummary(accountId, locale);
        setOverviewData(data);
      } catch (err: any) {
        console.error('[Insights Page] Error fetching overview summary:', err);
        setError(err.message || 'Failed to fetch insights');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTab, accountId, locale]);

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
      {/* Page Help + Tabs */}
      <div className={`mb-8 border-b border-border-subtle ${isRTL ? 'direction-rtl' : ''}`}>
        <div className="flex items-center gap-3 overflow-x-auto">
          {/* Page Help */}
          <div className="relative group shrink-0">
            <HelpCircle className="w-5 h-5 text-gray-400 hover:text-gray-200 cursor-help" />
            <div className="absolute z-50 bottom-full left-0 mb-2 px-3 py-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg border border-gray-700 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              {t('help.insights_page') || 'AI-powered analysis of your ad performance. Ask questions or browse automated insights.'}
              <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-800" />
            </div>
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                  ${isRTL ? 'flex-row-reverse' : ''}
                  ${isActive
                    ? 'border-primary-light text-primary-light bg-primary-dark/10'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-card-bg/50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-card-bg/40 border border-border-subtle rounded-xl p-4 h-32 animate-pulse"></div>
                  ))}
                </div>
                <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6 h-48 animate-pulse"></div>
              </div>
            )}

            {/* New Overview Content */}
            {!isLoading && overviewData && (
              <>
                {/* Daily/Weekly/Monthly Insights Cards */}
                <OverviewInsights
                  daily={overviewData.daily}
                  weekly={overviewData.weekly}
                  monthly={overviewData.monthly}
                  isRTL={isRTL}
                />

                {/* Improvement Checks (Learning Phase, Pixel, etc.) */}
                <ImprovementChecks
                  checks={overviewData.improvement_checks}
                  isRTL={isRTL}
                  title={t('insights.what_can_improve') || 'What Can Be Improved?'}
                />

                {/* TL;DR Summary */}
                <InsightsSummary
                  bullets={overviewData.summary}
                  isRTL={isRTL}
                  title={t('insights.summary') || 'Summary'}
                />

                {/* Generated Timestamp */}
                {overviewData.generated_at && (
                  <div className={`mt-8 text-center text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {new Date(overviewData.generated_at).toLocaleString(locale)}
                  </div>
                )}
              </>
            )}

            {/* Empty State */}
            {!isLoading && !overviewData && !error && (
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
            accountId={accountId}
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
            accountId={accountId}
          />
        )}

      </div>


      {/* Floating Action Button for AI Chat */}
      <button
        onClick={() => openChat()}
        className={`fixed bottom-8 ${isRTL ? 'left-8' : 'right-8'} bg-accent hover:bg-accent/90 text-white p-4 rounded-full shadow-2xl z-30 transition-all hover:scale-105 group`}
      >
        <div className={`absolute -top-2 ${isRTL ? '-left-2' : '-right-2'} w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-[#131620]`}></div>
        <Lightbulb className="w-8 h-8 group-hover:rotate-12 transition-transform" />
        <span className="sr-only">{t('insights.ai_investigator')}</span>
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
