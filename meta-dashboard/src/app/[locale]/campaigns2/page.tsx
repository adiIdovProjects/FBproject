"use client";

/**
 * Account Performance - Beginner-friendly campaigns view
 * Shows campaigns with status toggle, budget editing, and spend graph
 */

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MainLayout } from '../../../components/MainLayout';
import SimpleCampaignList from '../../../components/campaigns/SimpleCampaignList';
import DateFilter from '../../../components/DateFilter';
import { formatDate, calculateDateRange } from '../../../utils/date';

export default function AccountPerformance() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';

  // Initialize date range (default to last 30 days)
  const initialDates = useMemo(() => calculateDateRange('last_30_days'), []);
  const [startDate, setStartDate] = useState<string | null>(formatDate(initialDates.start));
  const [endDate, setEndDate] = useState<string | null>(formatDate(initialDates.end));

  const handleDateRangeChange = (newStart: string | null, newEnd: string | null) => {
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  return (
    <MainLayout
      title={t('account_performance.title') || 'Account Performance'}
      description={t('account_performance.description') || ''}
      compact
    >
      {/* Date Filter */}
      <div className="flex justify-end mb-4">
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
          lang={locale as any}
          isRTL={isRTL}
        />
      </div>

      {/* Campaign List with Graph */}
      <SimpleCampaignList startDate={startDate} endDate={endDate} />
    </MainLayout>
  );
}
