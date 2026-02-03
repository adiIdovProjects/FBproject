"use client";

/**
 * Manage Page - Campaign Hierarchy with Full Metrics
 * Shows Campaign -> Ad Set -> Ad hierarchy with expandable rows
 * Also includes Create/Edit functionality (combined with uploader)
 */

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Info, Eye, PlusCircle, ArrowRight, Sparkles, BarChart3, Lightbulb, MessageSquare } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import DateFilter from '../../../components/DateFilter';
import { AIHelpPanel } from '../../../components/campaigns/AIHelpPanel';
import CampaignControlTable from '../../../components/campaigns/CampaignControlTable';
import AnalysisTab from '../../../components/campaigns/AnalysisTab';
import RecommendationsTab from '../../../components/campaigns/RecommendationsTab';
import AIChatTab from '../../../components/campaigns/AIChatTab';

import { useAccount } from '../../../context/AccountContext';

// Utilities
import { formatDate, calculateDateRange } from '../../../utils/date';

const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

export default function ManagePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRTL = locale === 'ar' || locale === 'he';
  const { selectedAccountId, linkedAccounts } = useAccount();
  const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);
  const currency = selectedAccount?.currency || 'USD';

  // Tab state - check URL param for initial tab
  const [activeTab, setActiveTab] = useState<'view' | 'create' | 'analysis' | 'recommendations' | 'ai-chat'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'create') return 'create';
    if (tabParam === 'analysis') return 'analysis';
    if (tabParam === 'recommendations') return 'recommendations';
    if (tabParam === 'ai-chat') return 'ai-chat';
    return 'view';
  });

  // Initialize date range
  const initialDates = useMemo(() => calculateDateRange(DEFAULT_DATE_RANGE_KEY), []);
  const [startDate, setStartDate] = useState<string | null>(formatDate(initialDates.start));
  const [endDate, setEndDate] = useState<string | null>(formatDate(initialDates.end));

  // Handle date range change from DateFilter
  const handleDateRangeChange = (newStart: string | null, newEnd: string | null) => {
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  return (
    <MainLayout
      title={t('nav.campaign_control')}
      description={t('manage.subtitle')}
    >
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <button
          onClick={() => setActiveTab('view')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'view'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          {t('campaign_control.tab_view') || 'View & Control'}
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'create'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          {t('campaign_control.tab_create') || 'Create / Edit'}
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'analysis'
              ? 'bg-green-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          {t('campaign_control.tab_analysis') || 'Analysis'}
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'recommendations'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          {t('campaign_control.tab_recommendations') || 'Recommendations'}
        </button>
        <button
          onClick={() => setActiveTab('ai-chat')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'ai-chat'
              ? 'bg-cyan-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {t('campaign_control.tab_ai_chat') || 'Ask AI'}
        </button>
      </div>

      {/* View & Control Tab */}
      {activeTab === 'view' && (
        <>
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
            <DateFilter
              startDate={startDate}
              endDate={endDate}
              onDateRangeChange={handleDateRangeChange}
              lang={locale as any}
              t={t}
              isRTL={isRTL}
            />
          </div>

          {/* Quick Guide */}
          <div
            className="flex items-start gap-3 p-4 mb-6 bg-blue-500/5 border border-blue-500/20 rounded-xl"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-gray-300">
              {t('manage.hierarchy_guide')}
            </div>
          </div>

          {/* AI Help Panel */}
          <AIHelpPanel accountId={selectedAccountId} />

          {/* Campaign Control Table */}
          <CampaignControlTable
            accountId={selectedAccountId}
            currency={currency}
            locale={locale}
            startDate={startDate || ''}
            endDate={endDate || ''}
          />
        </>
      )}

      {/* Create / Edit Tab */}
      {activeTab === 'create' && (
        <div className="max-w-2xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* AI Assistant Card - Only Option */}
          <div
            onClick={() => router.push(`/${locale}/uploader/ai-captain`)}
            className="p-8 bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-amber-600/20 border-2 border-amber-500/50 rounded-2xl cursor-pointer hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg group-hover:scale-105 transition-transform">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {t('captain.try_ai_captain') || 'Build with AI Assistant'}
                  </h2>
                  <p className="text-amber-200/80 text-lg mt-1">
                    {t('captain.ai_description') || 'Create, edit, or add ads - AI guides you step by step'}
                  </p>
                </div>
              </div>
              <ArrowRight className={`w-8 h-8 text-amber-400 group-hover:translate-x-2 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-2' : ''}`} />
            </div>
          </div>

          {/* Helper text */}
          <p className="text-center text-gray-400 text-sm mt-6">
            {t('captain.ai_helper_text') || 'The AI will help you create new campaigns, add ads to existing ones, or edit your current ads.'}
          </p>
        </div>
      )}
      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <AnalysisTab accountId={selectedAccountId} />
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <RecommendationsTab accountId={selectedAccountId} />
      )}

      {/* AI Chat Tab */}
      {activeTab === 'ai-chat' && (
        <AIChatTab accountId={selectedAccountId} />
      )}
    </MainLayout>
  );
}
