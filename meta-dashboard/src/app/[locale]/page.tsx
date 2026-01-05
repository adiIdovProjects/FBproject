"use client";

/**
 * Performance Overview Dashboard
 * Main dashboard page showing KPIs and performance trends
 */

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  MousePointer,
  Repeat,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';

// Components
import { MainLayout } from '../../components/MainLayout';
import DateFilter from '../../components/DateFilter';
import MetricCard from '../../components/dashboard/MetricCard';
import SkeletonMetricCard from '../../components/dashboard/SkeletonMetricCard';
import ActionsMetricsChart from '../../components/dashboard/ActionsMetricsChart';
import InsightCard from '../../components/insights/InsightCard';

// Services & Types
import { fetchMetricsWithTrends } from '../../services/dashboard.service';
import { fetchInsightsSummary } from '../../services/insights.service';
import { MetricType, DateRange } from '../../types/dashboard.types';

// Utilities
import { formatDate, calculateDateRange } from '../../utils/date';

const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

export default function PerformanceDashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';

  // Debug logging
  console.log('[Dashboard] Current locale:', locale);

  // Initialize date range
  const initialDates = useMemo(() => calculateDateRange(DEFAULT_DATE_RANGE_KEY), []);
  const [startDate, setStartDate] = useState<string>(
    formatDate(initialDates.start) || formatDate(new Date()) || ''
  );
  const [endDate, setEndDate] = useState<string>(
    formatDate(initialDates.end) || formatDate(new Date()) || ''
  );

  // Chart metric selection
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('actions');

  // React Query: Fetch Metrics
  const {
    data: metricsData,
    isLoading: isMetricsLoading,
    error: metricsError
  } = useQuery({
    queryKey: ['dashboard-metrics', startDate, endDate],
    queryFn: () => fetchMetricsWithTrends({ startDate, endDate }),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // React Query: Fetch Insights
  const {
    data: insights,
    isLoading: isInsightsLoading
  } = useQuery({
    queryKey: ['dashboard-insights', startDate, endDate],
    queryFn: () => fetchInsightsSummary({ startDate, endDate }, 'dashboard'),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isLoading = isMetricsLoading || isInsightsLoading;
  const currency = metricsData?.currency || 'USD';
  const error = metricsError ? (metricsError as Error).message : null;

  // Handle date range change
  const handleDateRangeChange = (start: string | null, end: string | null) => {
    if (start) setStartDate(start);
    if (end) setEndDate(end);
  };

  return (
    <MainLayout
      title={t('dashboard.title')}
      description={t('dashboard.subtitle')}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
          lang={locale as any}
          t={t}
          isRTL={isRTL}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-400 text-red-300 rounded-xl">
          <p className="font-bold">{t('common.error_loading')}</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
        {isLoading ? (
          <>
            {[...Array(7)].map((_, i) => (
              <SkeletonMetricCard key={i} />
            ))}
          </>
        ) : (
          <>
            <MetricCard
              title={t('metrics.total_spend')}
              value={metricsData?.current.spend || 0}
              trend={metricsData?.trends.spend}
              icon={DollarSign}
              format="currency"
              isLoading={isLoading}
              currency={currency}
            />

            <MetricCard
              title={t('metrics.total_ctr')}
              value={metricsData?.current.ctr || 0}
              trend={metricsData?.trends.ctr}
              icon={Repeat}
              format="percentage"
              isLoading={isLoading}
            />

            <MetricCard
              title={t('metrics.total_cpc')}
              value={metricsData?.current.cpc || 0}
              trend={metricsData?.trends.cpc}
              icon={DollarSign}
              format="currency"
              isLoading={isLoading}
              currency={currency}
            />

            <MetricCard
              title={t('metrics.total_clicks')}
              value={metricsData?.current.clicks || 0}
              trend={metricsData?.trends.clicks}
              icon={MousePointer}
              format="number"
              isLoading={isLoading}
            />

            <MetricCard
              title={t('metrics.total_conversions')}
              value={metricsData?.current.actions || 0}
              trend={metricsData?.trends.actions}
              icon={ShoppingCart}
              format="number"
              isLoading={isLoading}
            />

            <MetricCard
              title={t('metrics.total_cpa')}
              value={metricsData?.current.cpa || 0}
              trend={metricsData?.trends.cpa}
              icon={DollarSign}
              format="currency"
              isLoading={isLoading}
              currency={currency}
            />

            {(metricsData?.current.conversion_value || 0) > 0 && (
              <MetricCard
                title={t('metrics.roas')}
                value={metricsData?.current.roas || 0}
                trend={metricsData?.trends.roas}
                icon={TrendingUp}
                format="decimal"
                isLoading={isLoading}
              />
            )}
          </>
        )}
      </div>

      {/* Quick Insights */}
      <div className="mb-8">
        <InsightCard
          insights={insights || []}
          isLoading={isLoading}
          isRTL={isRTL}
        />
      </div>

      {/* Performance Chart */}
      <ActionsMetricsChart
        dailyData={metricsData?.dailyData || []}
        selectedMetric={selectedMetric}
        onMetricChange={setSelectedMetric}
        isLoading={isLoading}
        currency={currency}
      />
    </MainLayout>
  );
}
