"use client";

/**
 * Performance Overview Dashboard
 * Main dashboard page showing KPIs and performance trends
 */

import { useState, useMemo, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  MousePointer,
  Repeat,
  ShoppingCart,
  TrendingUp,
  Loader2,
  CheckCircle,
} from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import DateFilter from '../../../components/DateFilter';
import MetricCard from '../../../components/dashboard/MetricCard';
import SkeletonMetricCard from '../../../components/dashboard/SkeletonMetricCard';
import ActionsMetricsChart from '../../../components/dashboard/ActionsMetricsChart';
import DayOfWeekTable from '../../../components/dashboard/DayOfWeekTable';
import DownloadLeadsSection from '../../../components/campaigns/DownloadLeadsSection';

// Services & Types
import { fetchMetricsWithTrends, fetchDayOfWeekBreakdown } from '../../../services/dashboard.service';
// Output removed by refactor

import { MetricType, DateRange } from '../../../types/dashboard.types';
import { useAccount } from '../../../context/AccountContext'; // Import context

// Utilities
import { formatDate, calculateDateRange } from '../../../utils/date';
import { TimeGranularity } from '../../../types/campaigns.types';
import TimeGranularityToggle from '../../../components/campaigns/TimeGranularityToggle';
import { apiClient } from '../../../services/apiClient';
import { useRouter } from 'next/navigation';

const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

export default function PerformanceDashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';
  const { selectedAccountId, hasROAS, linkedAccounts } = useAccount(); // Use context

  // Get page_id for the selected account (for lead forms)
  const selectedPageId = useMemo(() => {
    if (!selectedAccountId || !linkedAccounts.length) return null;
    const account = linkedAccounts.find(a => a.account_id === selectedAccountId);
    return account?.page_id || null;
  }, [selectedAccountId, linkedAccounts]);
  const router = useRouter();

  // Debug logging
  console.log('[Dashboard] Current locale:', locale);

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const response = await apiClient.get('/api/v1/auth/onboarding/status');
        const status = response.data;

        if (!status.onboarding_completed) {
          // Redirect to appropriate step using current locale
          router.push(`/${locale}/${status.next_step}`);
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
      }
    };

    checkOnboarding();
  }, [router]);

  // Sync status state
  const [syncStatus, setSyncStatus] = useState<{
    status: 'not_started' | 'in_progress' | 'completed' | 'failed';
    progress_percent: number;
  } | null>(null);
  // Track if user saw sync in progress (only show completed banner after waiting)
  const [sawSyncInProgress, setSawSyncInProgress] = useState(false);

  // Poll sync status every 2 seconds
  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        // Use apiClient which handles auth via HttpOnly cookies
        const response = await apiClient.get('/api/v1/sync/status');
        const data = response.data;
        // Track if we ever saw in_progress state
        if (data.status === 'in_progress') {
          setSawSyncInProgress(true);
        }
        setSyncStatus(data);
      } catch (error) {
        // 401 errors handled by apiClient interceptor
      }
    };

    // Initial check
    checkSyncStatus();

    // Poll every 2 seconds if syncing
    const interval = setInterval(() => {
      if (!syncStatus || syncStatus.status === 'in_progress') {
        checkSyncStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [syncStatus?.status]);

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
  const [granularity, setGranularity] = useState<TimeGranularity>('day');

  // React Query: Fetch Metrics
  const {
    data: metricsData,
    isLoading: isMetricsLoading,
    error: metricsError
  } = useQuery({
    queryKey: ['dashboard-metrics', startDate, endDate, selectedAccountId, granularity],
    queryFn: () => fetchMetricsWithTrends({ startDate, endDate }, selectedAccountId, granularity),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // React Query: Fetch Day of Week Breakdown
  const {
    data: dayOfWeekData,
    isLoading: isDayOfWeekLoading,
  } = useQuery({
    queryKey: ['day-of-week-breakdown', startDate, endDate, selectedAccountId],
    queryFn: () => fetchDayOfWeekBreakdown({ startDate, endDate }, selectedAccountId),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });


  const isLoading = isMetricsLoading;
  const currency = metricsData?.currency || 'USD';
  const error = metricsError ? (metricsError as Error).message : null;

  // Handle date range change
  const handleDateRangeChange = (start: string | null, end: string | null) => {
    if (start) setStartDate(start);
    if (end) setEndDate(end);
  };

  return (
    <MainLayout
      title={t('nav.account_performance')}
      description={t('dashboard.subtitle')}
    >
      {/* Sync Status Overlay */}
      {syncStatus && syncStatus.status === 'in_progress' && (
        <div className="mb-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <div className="absolute inset-0 w-8 h-8 bg-blue-400/20 rounded-full animate-ping" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg">Setting Up Your Dashboard</h3>
              <p className="text-gray-300 text-sm">We're importing your Facebook ad data. This usually takes 1-2 minutes...</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-400">{syncStatus.progress_percent}%</div>
              <div className="text-xs text-gray-400">Complete</div>
            </div>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 animate-pulse"
              style={{ width: `${syncStatus.progress_percent}%` }}
            />
          </div>
          <div className="mt-4 text-xs text-gray-400">
            💡 Your dashboard will update automatically when ready. Feel free to explore the interface!
          </div>
        </div>
      )}

      {/* Sync Completed Banner - only show if user waited for sync */}
      {syncStatus && syncStatus.status === 'completed' && sawSyncInProgress && (
        <div className="mb-6 bg-green-900/20 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-white font-semibold">Your data is ready!</p>
              <p className="text-gray-400 text-sm">Showing real-time insights from your Facebook ad accounts</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Download Leads Section */}
      <DownloadLeadsSection
        pageId={selectedPageId}
        accountId={selectedAccountId}
        startDate={startDate}
        endDate={endDate}
        t={t}
      />

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
              tooltipKey="metrics.spend_tooltip"
              metricType="spend"
            />

            <MetricCard
              title={t('metrics.total_ctr')}
              value={metricsData?.current.ctr || 0}
              trend={metricsData?.trends.ctr}
              icon={Repeat}
              format="percentage"
              isLoading={isLoading}
              tooltipKey="metrics.ctr_tooltip"
              metricType="performance"
            />

            <MetricCard
              title={t('metrics.total_cpc')}
              value={metricsData?.current.cpc || 0}
              trend={metricsData?.trends.cpc}
              icon={DollarSign}
              format="currency"
              isLoading={isLoading}
              currency={currency}
              tooltipKey="metrics.cpc_tooltip"
              metricType="efficiency"
            />

            <MetricCard
              title={t('metrics.total_clicks')}
              value={metricsData?.current.clicks || 0}
              trend={metricsData?.trends.clicks}
              icon={MousePointer}
              format="number"
              isLoading={isLoading}
              tooltipKey="metrics.clicks_tooltip"
              metricType="performance"
            />

            <MetricCard
              title={t('metrics.total_conversions')}
              value={metricsData?.current.actions || 0}
              trend={metricsData?.trends.actions}
              icon={ShoppingCart}
              format="number"
              isLoading={isLoading}
              tooltipKey="metrics.conversions_tooltip"
              metricType="performance"
            />

            <MetricCard
              title={t('metrics.total_cpa')}
              value={metricsData?.current.cpa || 0}
              trend={metricsData?.trends.cpa}
              icon={DollarSign}
              format="currency"
              isLoading={isLoading}
              currency={currency}
              tooltipKey="metrics.cpa_tooltip"
              metricType="efficiency"
            />

            {hasROAS && (
              <MetricCard
                title={t('metrics.roas')}
                value={metricsData?.current.roas || 0}
                trend={metricsData?.trends.roas}
                icon={TrendingUp}
                format="decimal"
                isLoading={isLoading}
                tooltipKey="metrics.roas_tooltip"
                metricType="performance"
              />
            )}
          </>
        )}
      </div>

      {/* Quick Insights - Removed */}

      {/* Performance Chart */}
      <div className="mb-4 flex items-center justify-start">
        <TimeGranularityToggle
          selected={granularity}
          onChange={setGranularity}
          isRTL={isRTL}
        />
      </div>

      <ActionsMetricsChart
        dailyData={metricsData?.dailyData || []}
        selectedMetric={selectedMetric}
        onMetricChange={setSelectedMetric}
        isLoading={isLoading}
        currency={currency}
        granularity={granularity}
      />

      {/* Day of Week Performance Table */}
      <div className="mt-8">
        <DayOfWeekTable
          data={dayOfWeekData || []}
          isLoading={isDayOfWeekLoading}
          currency={currency}
          isRTL={isRTL}
          hasROAS={hasROAS ?? undefined}
        />
      </div>
    </MainLayout>
  );
}
