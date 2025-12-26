"use client";

/**
 * Performance Overview Dashboard
 * Main dashboard page showing KPIs and performance trends
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  DollarSign,
  MousePointer,
  Repeat,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';

// Components
import { MainLayout } from '../../components/MainLayout';
import Navigation from '../../components/Navigation';
import DateFilter from '../../components/DateFilter';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import MetricCard from '../../components/dashboard/MetricCard';
import SkeletonMetricCard from '../../components/dashboard/SkeletonMetricCard';
import ActionsMetricsChart from '../../components/dashboard/ActionsMetricsChart';

// Services & Types
import { fetchMetricsWithTrends } from '../../services/dashboard.service';
import { MetricType, DateRange } from '../../types/dashboard.types';

// Utilities
import { formatDate, calculateDateRange } from '../../utils/date';

const DEFAULT_DATE_RANGE_KEY = 'maximum';

export default function PerformanceDashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';
  const dir = isRTL ? 'rtl' : 'ltr';

  // Debug logging
  console.log('[Dashboard] Current locale:', locale);
  console.log('[Dashboard] Title translation:', t('dynamic_dashboard_title'));
  console.log('[Dashboard] Spend translation:', t('total_spend'));

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

  // Data state
  const [metricsData, setMetricsData] = useState<any>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data when date range changes
  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate) return;

      setIsLoading(true);
      setError(null);

      try {
        const dateRange: DateRange = { startDate, endDate };
        const data = await fetchMetricsWithTrends(dateRange);
        setMetricsData(data);
        setCurrency(data.currency || 'USD');  // Set currency from API
      } catch (err: any) {
        console.error('[Dashboard] Error fetching data:', err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // Handle date range change
  const handleDateRangeChange = (start: string | null, end: string | null) => {
    if (start) setStartDate(start);
    if (end) setEndDate(end);
  };

  return (
    <MainLayout
      title={t('dynamic_dashboard_title') || t('dashboard_title')}
      description={t('dashboard_subtitle') || t('dashboard_description')}
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
        <LanguageSwitcher />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-400 text-red-300 rounded-xl">
          <p className="font-bold">{t('extracted_error_loading_data')}</p>
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
              title={t('total_spend')}
              value={metricsData?.current.spend || 0}
              trend={metricsData?.trends.spend}
              icon={DollarSign}
              format="currency"
              isLoading={isLoading}
              currency={currency}
            />

            <MetricCard
              title={t('total_ctr')}
              value={metricsData?.current.ctr || 0}
              trend={metricsData?.trends.ctr}
              icon={Repeat}
              format="percentage"
              isLoading={isLoading}
            />

            <MetricCard
              title={t('total_cpc')}
              value={metricsData?.current.cpc || 0}
              trend={metricsData?.trends.cpc}
              icon={DollarSign}
              format="currency"
              isLoading={isLoading}
              currency={currency}
            />

            <MetricCard
              title={t('total_clicks')}
              value={metricsData?.current.clicks || 0}
              trend={metricsData?.trends.clicks}
              icon={MousePointer}
              format="number"
              isLoading={isLoading}
            />

            <MetricCard
              title={t('total_purchases')}
              value={metricsData?.current.actions || 0}
              trend={metricsData?.trends.actions}
              icon={ShoppingCart}
              format="number"
              isLoading={isLoading}
            />

            <MetricCard
              title={t('total_cpa')}
              value={metricsData?.current.cpa || 0}
              trend={metricsData?.trends.cpa}
              icon={DollarSign}
              format="currency"
              isLoading={isLoading}
              currency={currency}
            />

            <MetricCard
              title={t('extracted_roas')}
              value={metricsData?.current.roas || 0}
              trend={metricsData?.trends.roas}
              icon={TrendingUp}
              format="decimal"
              isLoading={isLoading}
            />
          </>
        )}
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
