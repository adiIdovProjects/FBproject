"use client";

/**
 * Manage Page - Campaign Hierarchy with Full Metrics
 * Shows Campaign -> Ad Set -> Ad hierarchy with expandable rows
 */

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Info } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import DateFilter from '../../../components/DateFilter';
import { AIHelpPanel } from '../../../components/campaigns/AIHelpPanel';
import CampaignControlTable from '../../../components/campaigns/CampaignControlTable';

import { useAccount } from '../../../context/AccountContext';

// Utilities
import { formatDate, calculateDateRange } from '../../../utils/date';

const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

export default function ManagePage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';
  const { selectedAccountId, linkedAccounts } = useAccount();
  const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);
  const currency = selectedAccount?.currency || 'USD';

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
    </MainLayout>
  );
}
