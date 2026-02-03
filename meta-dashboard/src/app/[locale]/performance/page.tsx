"use client";

/**
 * Performance Page - AI-first unified performance view
 * Shows AI interpretation, key metrics, trend chart, and actionable recommendations
 */

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MainLayout2 } from '../../../components/MainLayout2';
import AISummaryCard from '../../../components/homepage/AISummaryCard';
import HomepageKPICards from '../../../components/homepage/HomepageKPICards';
import PerformanceChart from '../../../components/performance/PerformanceChart';
import { formatDate, calculateDateRange } from '../../../utils/date';
import ActionableRecommendations from '../../../components/performance/ActionableRecommendations';
import { QuickSelectKey } from '../../../constants/app';

export default function Performance() {
  const t = useTranslations();
  const locale = useLocale();
  const [dateRange, setDateRange] = useState<QuickSelectKey>('last_30_days');

  // Calculate date range for KPI cards
  const dates = useMemo(() => calculateDateRange(dateRange), [dateRange]);
  const startDate = formatDate(dates.start);
  const endDate = formatDate(dates.end);

  const dateRangeOptions = [
    { value: 'last_7_days', label: t('campaigns2.last_7_days') },
    { value: 'last_14_days', label: t('campaigns2.last_14_days') },
    { value: 'last_30_days', label: t('campaigns2.last_30_days') },
  ];

  return (
    <MainLayout2 title={t('performance.title')} description={t('performance.description')} compact>
      {/* Date Range Selector */}
      <div className="flex justify-end mb-6">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as QuickSelectKey)}
          className="bg-card border border-border-subtle rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {dateRangeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* AI Summary */}
      <div className="mb-6">
        <AISummaryCard locale={locale} />
      </div>

      {/* Key Metrics */}
      <div className="mb-8">
        <HomepageKPICards startDate={startDate} endDate={endDate} locale={locale} />
      </div>

      {/* Trend Chart */}
      <div className="mb-8">
        <PerformanceChart dateRange={dateRange} />
      </div>

      {/* Actionable Recommendations */}
      <div>
        <ActionableRecommendations locale={locale} />
      </div>
    </MainLayout2>
  );
}
