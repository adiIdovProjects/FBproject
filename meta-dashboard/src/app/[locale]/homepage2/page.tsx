"use client";

/**
 * Homepage2 - Alternative homepage with Campaign Control table
 * Shows full campaign hierarchy with controls instead of simple campaign list
 */

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MainLayout } from '../../../components/MainLayout';
import { useAccount } from '../../../context/AccountContext';
import QuickStats from '../../../components/homepage/QuickStats';
import TopCreatives from '../../../components/homepage/TopCreatives';
import ActionPanel from '../../../components/homepage/ActionPanel';
import SimpleRecommendations from '../../../components/homepage/SimpleRecommendations';
import CampaignControlTable from '../../../components/campaigns/CampaignControlTable';
import DateFilter from '../../../components/DateFilter';
import { AIChat } from '../../../components/insights/AIChat';
import { formatDate, calculateDateRange } from '../../../utils/date';

const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

export default function Homepage2() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';
  const { selectedAccountId, linkedAccounts } = useAccount();
  const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);
  const currency = selectedAccount?.currency || 'USD';

  // AI Chat modal state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Date range state
  const initialDates = useMemo(() => calculateDateRange(DEFAULT_DATE_RANGE_KEY), []);
  const [startDate, setStartDate] = useState<string | null>(formatDate(initialDates.start));
  const [endDate, setEndDate] = useState<string | null>(formatDate(initialDates.end));

  const handleDateRangeChange = (newStart: string | null, newEnd: string | null) => {
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  return (
    <MainLayout
      title={t('homepage.title')}
      description={t('homepage.subtitle')}
    >
      {/* Quick Stats - Top row (uses date filter, shows Conversions) */}
      <QuickStats
        accountId={selectedAccountId}
        startDate={startDate}
        endDate={endDate}
        showConversions={true}
      />

      {/* Date Filter */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mt-8 mb-6">
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
          lang={locale as any}
          t={t}
          isRTL={isRTL}
        />
      </div>

      {/* Main content - Campaign Control + Actions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Control Table + Top Creatives - Takes 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          <CampaignControlTable
            accountId={selectedAccountId}
            currency={currency}
            locale={locale}
            startDate={startDate || ''}
            endDate={endDate || ''}
          />
          <TopCreatives
            accountId={selectedAccountId}
            startDate={startDate}
            endDate={endDate}
            showConversions={true}
          />
        </div>

        {/* Action Panel + Recommendations - Right sidebar */}
        <div className="space-y-6">
          <ActionPanel onOpenChat={() => setIsChatOpen(true)} />
          <SimpleRecommendations accountId={selectedAccountId} />
        </div>
      </div>

      {/* AI Chat Modal */}
      <AIChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        accountId={selectedAccountId || undefined}
      />
    </MainLayout>
  );
}
