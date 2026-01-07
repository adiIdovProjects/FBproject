"use client";

/**
 * Campaign Performance Analysis Page
 * Shows campaign-level metrics with period comparisons and breakdowns
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { DollarSign, ShoppingCart, TrendingUp, Search, Filter } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import Navigation from '../../../components/Navigation';
import DateFilter from '../../../components/DateFilter';
import MetricCard from '../../../components/dashboard/MetricCard';
import SkeletonMetricCard from '../../../components/dashboard/SkeletonMetricCard';
import ActionsMetricsChart from '../../../components/dashboard/ActionsMetricsChart';
import TimeGranularityToggle from '../../../components/campaigns/TimeGranularityToggle';
import ExportButton from '../../../components/campaigns/ExportButton';
import CampaignsTable from '../../../components/campaigns/CampaignsTable';
import BreakdownTabs from '../../../components/campaigns/BreakdownTabs';
import InsightCard from '../../../components/insights/InsightCard';

// Services & Types
import { fetchCampaignsWithComparison, fetchTrendData } from '../../../services/campaigns.service';
import { fetchInsightsSummary, InsightItem } from '../../../services/insights.service';
import { CampaignRow, TimeGranularity, CampaignMetrics, DateRange } from '../../../types/campaigns.types';
import { MetricType } from '../../../types/dashboard.types';
import { useCallback } from 'react';
import { useAccount } from '../../../context/AccountContext'; // Import context

// Utilities
import { formatDate, calculateDateRange } from '../../../utils/date';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

export default function CampaignsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';
  const dir = isRTL ? 'rtl' : 'ltr';
  const { selectedAccountId } = useAccount(); // Use context

  // Initialize date range
  const initialDates = useMemo(() => calculateDateRange(DEFAULT_DATE_RANGE_KEY), []);
  const [startDate, setStartDate] = useState<string>(
    formatDate(initialDates.start) || formatDate(new Date()) || ''
  );
  const [endDate, setEndDate] = useState<string>(
    formatDate(initialDates.end) || formatDate(new Date()) || ''
  );

  // Chart state
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('spend');
  const [granularity, setGranularity] = useState<TimeGranularity>('day');

  // Data state
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [currency, setCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState(false);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  // Insights state
  const [insights, setInsights] = useState<InsightItem[]>([]);

  // Handle search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Fetch data when date range changes
  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate) return;

      setIsLoading(true);
      setError(null);

      try {
        const dateRange: DateRange = { startDate, endDate };

        // Fetch campaigns with comparison, overview, and insights in parallel
        const [campaignsData, overviewData, insightsData] = await Promise.all([
          fetchCampaignsWithComparison(dateRange, statusFilter, searchQuery, undefined, undefined, selectedAccountId),
          fetch(`${API_BASE_URL}/api/v1/metrics/overview?start_date=${startDate}&end_date=${endDate}${selectedAccountId ? `&account_id=${selectedAccountId}` : ''}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null),
          fetchInsightsSummary(dateRange, 'campaigns', {
            campaignFilter: searchQuery || undefined
          }, selectedAccountId)
        ]);

        setCampaigns(campaignsData);
        setInsights(insightsData);

        if (overviewData?.currency) {
          setCurrency(overviewData.currency);
        }
      } catch (err: any) {
        console.error('[Campaigns Page] Error fetching campaigns:', err);
        setError(err.message || 'Failed to fetch campaigns');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, statusFilter, searchQuery, selectedAccountId]);

  // Fetch trend data when granularity changes
  useEffect(() => {
    const fetchTrend = async () => {
      if (!startDate || !endDate) return;

      setIsTrendLoading(true);
      try {
        const dateRange: DateRange = { startDate, endDate };
        const data = await fetchTrendData(dateRange, granularity, selectedAccountId);
        setTrendData(data || []);
      } catch (err: any) {
        console.error('[Campaigns Page] Error fetching trend data:', err);
      } finally {
        setIsTrendLoading(false);
      }
    };

    fetchTrend();
  }, [startDate, endDate, granularity, selectedAccountId]);

  // Calculate aggregated metrics from campaigns
  const aggregatedMetrics: CampaignMetrics = useMemo(() => {
    if (campaigns.length === 0) {
      return {
        totalSpend: 0,
        totalPurchases: 0,
        avgRoas: 0,
        totalConversions: 0,
        avgCpa: 0,
        spendTrend: 0,
        purchasesTrend: 0,
        roasTrend: 0,
        conversionsTrend: 0,
        cpaTrend: 0,
      };
    }

    // Sum current period
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
    const totalConversionValue = campaigns.reduce((sum, c) => sum + (c.conversion_value || 0), 0);
    const avgRoas = totalSpend > 0 && totalConversions > 0 ? totalConversionValue / totalSpend : 0;
    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

    // Sum previous period
    const previousSpend = campaigns.reduce((sum, c) => sum + (c.previous_spend || 0), 0);
    const previousConversions = campaigns.reduce((sum, c) => sum + (c.previous_conversions || 0), 0);
    const previousConversionValue = campaigns.reduce((sum, c) => sum + (c.previous_conversion_value || 0), 0);
    const previousAvgRoas = previousSpend > 0 && previousConversions > 0 ? previousConversionValue / previousSpend : 0;
    const previousAvgCpa = previousConversions > 0 ? previousSpend / previousConversions : 0;

    // Calculate trends
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalSpend,
      avgRoas,
      totalConversions,
      avgCpa,
      previousTotalSpend: previousSpend,
      previousAvgRoas: previousAvgRoas,
      previousTotalConversions: previousConversions,
      previousAvgCpa: previousAvgCpa,
      spendTrend: calculateTrend(totalSpend, previousSpend),
      roasTrend: calculateTrend(avgRoas, previousAvgRoas),
      conversionsTrend: calculateTrend(totalConversions, previousConversions),
      cpaTrend: -calculateTrend(avgCpa, previousAvgCpa), // Inverse for CPA
    };
  }, [campaigns]);

  // Map trend data for chart
  const chartData = useMemo(() => {
    return trendData.map((point) => ({
      date: point.date,
      total_spend: point.spend || 0,
      total_impressions: point.impressions || 0,
      total_clicks: point.clicks || 0,
      total_conversions: point.conversions || 0,
      total_leads: 0,
      conversion_value: 0,
    }));
  }, [trendData]);

  // Handle date range change
  const handleDateRangeChange = useCallback((start: string | null, end: string | null) => {
    if (start && start !== startDate) setStartDate(start);
    if (end && end !== endDate) setEndDate(end);
  }, [startDate, endDate]);

  return (
    <MainLayout
      title={t('campaigns.title')}
      description={t('campaigns.subtitle')}
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <DateFilter
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChange}
            lang={locale as any}
            t={t}
            isRTL={isRTL}
          />

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 md:w-64">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500`} />
              <input
                type="text"
                placeholder={t('campaigns.search_placeholder')}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className={`w-full bg-card-bg/40 border border-border-subtle rounded-xl py-2.5 ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'} text-sm text-white focus:border-accent/50 outline-none transition-all placeholder:text-gray-600`}
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500`} />
              <select
                value={statusFilter[0] || ''}
                onChange={(e) => setStatusFilter(e.target.value ? [e.target.value] : [])}
                className={`bg-card-bg/40 border border-border-subtle rounded-xl py-2.5 ${isRTL ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8'} text-sm text-white focus:border-accent/50 outline-none transition-all appearance-none cursor-pointer min-w-[140px]`}
              >
                <option value="" className="bg-gray-900 text-white">{t('common.all_statuses')}</option>
                <option value="ACTIVE" className="bg-gray-900 text-white">ACTIVE</option>
                <option value="PAUSED" className="bg-gray-900 text-white">PAUSED</option>
                <option value="ARCHIVED" className="bg-gray-900 text-white">ARCHIVED</option>
              </select>
              <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none`}>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton
            dateRange={{ startDate, endDate }}
            onExportSuccess={(msg) => setExportMessage({ type: 'success', text: msg })}
            onExportError={(msg) => setExportMessage({ type: 'error', text: msg })}
          />
        </div>
      </div>

      {/* Export Message */}
      {exportMessage && (
        <div className={`mb-6 p-4 rounded-xl ${exportMessage.type === 'success'
          ? 'bg-green-900/50 border border-green-400 text-green-300'
          : 'bg-red-900/50 border border-red-400 text-red-300'
          }`}>
          <p className="text-sm">{exportMessage.text}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-400 text-red-300 rounded-xl">
          <p className="font-bold">{t('common.error_loading')}</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Core Metrics KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <SkeletonMetricCard key={i} />
            ))}
          </>
        ) : (
          <>
            <MetricCard
              title={t('metrics.total_spend')}
              value={aggregatedMetrics.totalSpend}
              trend={aggregatedMetrics.spendTrend}
              icon={DollarSign}
              format="currency"
              isLoading={isLoading}
              currency={currency}
            />

            {aggregatedMetrics.totalConversions > 0 && (
              <MetricCard
                title={t('metrics.average_roas')}
                value={aggregatedMetrics.avgRoas}
                trend={aggregatedMetrics.roasTrend}
                icon={TrendingUp}
                format="decimal"
                isLoading={isLoading}
              />
            )}

            <MetricCard
              title={t('metrics.total_conversions')}
              value={aggregatedMetrics.totalConversions}
              trend={aggregatedMetrics.conversionsTrend}
              icon={ShoppingCart}
              format="number"
              isLoading={isLoading}
            />

            <MetricCard
              title={t('metrics.average_cpa')}
              value={aggregatedMetrics.avgCpa}
              trend={aggregatedMetrics.cpaTrend}
              icon={DollarSign}
              format="currency"
              isLoading={isLoading}
              currency={currency}
            />
          </>
        )}
      </div>

      {/* Quick Insights */}
      <div className="mb-8">
        <InsightCard
          insights={insights}
          isLoading={isLoading}
          isRTL={isRTL}
        />
      </div>

      {/* Performance Chart */}
      <div className="mb-8">
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <h2 className="text-2xl font-bold text-gray-100">{t('campaigns.chart_title')}</h2>
          <TimeGranularityToggle
            selected={granularity}
            onChange={setGranularity}
            isRTL={isRTL}
          />
        </div>

        <ActionsMetricsChart
          dailyData={chartData}
          selectedMetric={selectedMetric}
          onMetricChange={setSelectedMetric}
          isLoading={isTrendLoading}
          currency={currency}
        />
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-100 mb-4">{t('campaigns.table_title')}</h2>
        <CampaignsTable
          campaigns={campaigns}
          isLoading={isLoading}
          currency={currency}
          isRTL={isRTL}
        />
      </div>

      {/* Breakdown Analysis */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-100 mb-4">{t('campaigns.breakdown_title')}</h2>
        <BreakdownTabs
          dateRange={{ startDate, endDate }}
          currency={currency}
          isRTL={isRTL}
          statusFilter={statusFilter}
          searchQuery={searchQuery}
        />
      </div>
    </MainLayout>
  );
}
