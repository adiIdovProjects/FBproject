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
import LanguageSwitcher from '../../../components/LanguageSwitcher';
import MetricCard from '../../../components/dashboard/MetricCard';
import SkeletonMetricCard from '../../../components/dashboard/SkeletonMetricCard';
import ActionsMetricsChart from '../../../components/dashboard/ActionsMetricsChart';
import TimeGranularityToggle from '../../../components/campaigns/TimeGranularityToggle';
import ExportButton from '../../../components/campaigns/ExportButton';
import CampaignsTable from '../../../components/campaigns/CampaignsTable';
import BreakdownTabs from '../../../components/campaigns/BreakdownTabs';

// Services & Types
import { fetchCampaignsWithComparison, fetchTrendData } from '../../../services/campaigns.service';
import { CampaignRow, TimeGranularity, CampaignMetrics, DateRange } from '../../../types/campaigns.types';
import { MetricType } from '../../../types/dashboard.types';
import { useCallback } from 'react';

// Utilities
import { formatDate, calculateDateRange } from '../../../utils/date';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

export default function CampaignsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';
  const dir = isRTL ? 'rtl' : 'ltr';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  // Fetch data when date range changes
  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate) return;

      setIsLoading(true);
      setError(null);

      try {
        const dateRange: DateRange = { startDate, endDate };

        // Fetch campaigns with comparison
        const campaignsData = await fetchCampaignsWithComparison(dateRange, statusFilter, searchQuery);
        setCampaigns(campaignsData);

        // Fetch overview to get account currency
        try {
          const overviewUrl = `${API_BASE_URL}/api/v1/metrics/overview?start_date=${startDate}&end_date=${endDate}`;
          const overviewRes = await fetch(overviewUrl);
          if (overviewRes.ok) {
            const overviewData = await overviewRes.json();
            if (overviewData.currency) {
              setCurrency(overviewData.currency);
            }
          }
        } catch (currErr) {
          console.error('[Campaigns Page] Error fetching currency:', currErr);
        }
      } catch (err: any) {
        console.error('[Campaigns Page] Error fetching campaigns:', err);
        setError(err.message || 'Failed to fetch campaigns');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, statusFilter, searchQuery]);

  // Fetch trend data when granularity changes
  useEffect(() => {
    const fetchTrend = async () => {
      if (!startDate || !endDate) return;

      setIsTrendLoading(true);
      try {
        const dateRange: DateRange = { startDate, endDate };
        const data = await fetchTrendData(dateRange, granularity);
        setTrendData(data || []);
      } catch (err: any) {
        console.error('[Campaigns Page] Error fetching trend data:', err);
      } finally {
        setIsTrendLoading(false);
      }
    };

    fetchTrend();
  }, [startDate, endDate, granularity]);

  // Calculate aggregated metrics from campaigns
  const aggregatedMetrics: CampaignMetrics = useMemo(() => {
    if (campaigns.length === 0) {
      return {
        totalSpend: 0,
        avgRoas: 0,
        totalPurchases: 0,
        avgCpa: 0,
        spendTrend: 0,
        roasTrend: 0,
        purchasesTrend: 0,
        cpaTrend: 0,
      };
    }

    // Sum current period
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalPurchases = campaigns.reduce((sum, c) => sum + c.purchases, 0);
    const avgRoas = campaigns.reduce((sum, c) => sum + c.roas, 0) / campaigns.length;
    const avgCpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0;

    // Sum previous period
    const previousSpend = campaigns.reduce((sum, c) => sum + (c.previous_spend || 0), 0);
    const previousPurchases = campaigns.reduce((sum, c) => sum + (c.previous_purchases || 0), 0);
    const previousRoas = campaigns
      .filter(c => c.previous_roas !== undefined)
      .reduce((sum, c) => sum + (c.previous_roas || 0), 0) / campaigns.length;
    const previousCpa = previousPurchases > 0 ? previousSpend / previousPurchases : 0;

    // Calculate trends
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalSpend,
      avgRoas,
      totalPurchases,
      avgCpa,
      previousTotalSpend: previousSpend,
      previousAvgRoas: previousRoas,
      previousTotalPurchases: previousPurchases,
      previousAvgCpa: previousCpa,
      spendTrend: calculateTrend(totalSpend, previousSpend),
      roasTrend: calculateTrend(avgRoas, previousRoas),
      purchasesTrend: calculateTrend(totalPurchases, previousPurchases),
      cpaTrend: calculateTrend(avgCpa, previousCpa),
    };
  }, [campaigns]);

  // Map trend data for chart
  const chartData = useMemo(() => {
    return trendData.map((point) => ({
      date: point.date,
      total_spend: point.spend || 0,
      total_impressions: point.impressions || 0,
      total_clicks: point.clicks || 0,
      total_purchases: point.purchases || 0,
      total_leads: 0,
      purchase_value: 0,
    }));
  }, [trendData]);

  // Handle date range change
  const handleDateRangeChange = useCallback((start: string | null, end: string | null) => {
    if (start && start !== startDate) setStartDate(start);
    if (end && end !== endDate) setEndDate(end);
  }, [startDate, endDate]);

  return (
    <MainLayout
      title={t('extracted_campaign_performance_analysis')}
      description={t('extracted_detailed_performance_metrics_and_breakdowns_for_all_active_campaigns')}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
          lang={locale as any}
          t={t}
          isRTL={isRTL}
        />

        <div className="flex items-center gap-4">
          <ExportButton
            dateRange={{ startDate, endDate }}
            onExportSuccess={(msg) => setExportMessage({ type: 'success', text: msg })}
            onExportError={(msg) => setExportMessage({ type: 'error', text: msg })}
          />
          <LanguageSwitcher />
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
          <p className="font-bold">{t('extracted_error_loading_data')}</p>
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
              title={t('extracted_total_spend')}
              value={aggregatedMetrics.totalSpend}
              trend={aggregatedMetrics.spendTrend}
              icon={DollarSign}
              format="currency"
              isLoading={isLoading}
              currency={currency}
            />

            <MetricCard
              title={t('extracted_average_roas')}
              value={aggregatedMetrics.avgRoas}
              trend={aggregatedMetrics.roasTrend}
              icon={TrendingUp}
              format="decimal"
              isLoading={isLoading}
            />

            <MetricCard
              title={t('extracted_total_purchases')}
              value={aggregatedMetrics.totalPurchases}
              trend={aggregatedMetrics.purchasesTrend}
              icon={ShoppingCart}
              format="number"
              isLoading={isLoading}
            />

            <MetricCard
              title={t('extracted_average_cpa')}
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

      {/* Performance Chart */}
      <div className="mb-8">
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <h2 className="text-2xl font-bold text-gray-100">{t('extracted_performance_over_time')}</h2>
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

      {/* Campaigns Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-100 mb-4">{t('extracted_campaigns')}</h2>
        <CampaignsTable
          campaigns={campaigns}
          isLoading={isLoading}
          currency={currency}
          isRTL={isRTL}
        />
      </div>

      {/* Breakdown Analysis */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-100 mb-4">{t('extracted_breakdown_analysis')}</h2>
        <BreakdownTabs
          dateRange={{ startDate, endDate }}
          currency={currency}
          isRTL={isRTL}
        />
      </div>
    </MainLayout>
  );
}
