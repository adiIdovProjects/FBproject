"use client";

/**
 * Advanced Analytics Page
 * Consolidated view for advanced users showing:
 * - Campaigns (with hierarchy: Campaign -> Ad Set -> Ad)
 * - Targeting analysis
 * - Creatives analysis
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Info, Eye, Target, Image } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import DateFilter from '../../../components/DateFilter';
import CampaignControlTable from '../../../components/campaigns/CampaignControlTable';
import TimeGranularityToggle from '../../../components/campaigns/TimeGranularityToggle';
import ActionsMetricsChart from '../../../components/dashboard/ActionsMetricsChart';
import CreativeBreakdownTabs from '../../../components/creatives/CreativeBreakdownTabs';
import TargetingTable from '../../../components/targeting/TargetingTable';
import CreativesTable from '../../../components/creatives/CreativesTable';
import { useInView } from '../../../hooks/useInView';

import { useAccount } from '../../../context/AccountContext';

// Services
import { fetchTrendData, fetchBreakdown } from '../../../services/campaigns.service';
import { fetchCreatives } from '../../../services/creatives.service';
import { TargetingRow } from '../../../types/targeting.types';
import { CreativeMetrics } from '../../../types/creatives.types';
import { MetricType, DateRange } from '../../../types/dashboard.types';
import { TimeGranularity } from '../../../types/campaigns.types';

// Utilities
import { formatDate, calculateDateRange } from '../../../utils/date';

const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

export default function AdvancedAnalyticsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const isRTL = locale === 'ar' || locale === 'he';
  const { selectedAccountId, linkedAccounts } = useAccount();
  const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);
  const currency = selectedAccount?.currency || 'USD';

  // Tab state - 3 tabs: campaigns, targeting, creatives
  const [activeTab, setActiveTab] = useState<'campaigns' | 'targeting' | 'creatives'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'targeting') return 'targeting';
    if (tabParam === 'creatives') return 'creatives';
    return 'campaigns';
  });

  // Initialize date range
  const initialDates = useMemo(() => calculateDateRange(DEFAULT_DATE_RANGE_KEY), []);
  const [startDate, setStartDate] = useState<string | null>(formatDate(initialDates.start));
  const [endDate, setEndDate] = useState<string | null>(formatDate(initialDates.end));

  // Chart state for campaigns tab
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('spend');
  const [granularity, setGranularity] = useState<TimeGranularity>('week');
  const [trendData, setTrendData] = useState<any[]>([]);
  const [isTrendLoading, setIsTrendLoading] = useState(false);

  // Targeting tab state
  const [targetingData, setTargetingData] = useState<TargetingRow[]>([]);
  const [isTargetingLoading, setIsTargetingLoading] = useState(false);

  // Creatives tab state
  const [creatives, setCreatives] = useState<CreativeMetrics[]>([]);
  const [isCreativesLoading, setIsCreativesLoading] = useState(false);

  // Viewport-based lazy loading for breakdown section
  const [breakdownRef, isBreakdownVisible] = useInView();

  const dateRange: DateRange = useMemo(() => ({
    startDate: startDate || '',
    endDate: endDate || ''
  }), [startDate, endDate]);

  // Handle date range change from DateFilter
  const handleDateRangeChange = useCallback((newStart: string | null, newEnd: string | null) => {
    setStartDate(newStart);
    setEndDate(newEnd);
  }, []);

  // Fetch trend data for campaigns tab
  useEffect(() => {
    if (activeTab !== 'campaigns' || !startDate || !endDate) return;

    const fetchTrend = async () => {
      setIsTrendLoading(true);
      try {
        const data = await fetchTrendData(dateRange, granularity, selectedAccountId || undefined);
        setTrendData(data || []);
      } catch (err) {
        console.error('Error fetching trend data:', err);
      } finally {
        setIsTrendLoading(false);
      }
    };
    fetchTrend();
  }, [activeTab, dateRange, granularity, selectedAccountId, startDate, endDate]);

  // Fetch targeting data
  useEffect(() => {
    if (activeTab !== 'targeting' || !startDate || !endDate) return;

    const loadTargeting = async () => {
      setIsTargetingLoading(true);
      try {
        const data = await fetchBreakdown(dateRange, 'adset', 'both', [], '', selectedAccountId || undefined);
        setTargetingData(data as TargetingRow[]);
      } catch (err) {
        console.error('Error fetching targeting data:', err);
      } finally {
        setIsTargetingLoading(false);
      }
    };
    loadTargeting();
  }, [activeTab, dateRange, selectedAccountId, startDate, endDate]);

  // Fetch creatives data
  useEffect(() => {
    if (activeTab !== 'creatives' || !startDate || !endDate) return;

    const loadCreatives = async () => {
      setIsCreativesLoading(true);
      try {
        const data = await fetchCreatives({ dateRange, sort_by: 'spend' }, selectedAccountId);
        setCreatives(data);
      } catch (err) {
        console.error('Error fetching creatives:', err);
      } finally {
        setIsCreativesLoading(false);
      }
    };
    loadCreatives();
  }, [activeTab, dateRange, selectedAccountId, startDate, endDate]);

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

  return (
    <MainLayout
      title={t('nav.advanced_analytics') || 'Advanced Analytics'}
      description={t('advanced.subtitle') || 'Pause, resume, and analyze your campaigns, targeting, and creatives'}
    >
      {/* Tab Navigation - 3 tabs: Campaigns, Targeting, Creatives */}
      <div className="flex gap-2 mb-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'campaigns'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          {t('nav.campaigns') || 'Campaigns'}
        </button>
        <button
          onClick={() => setActiveTab('targeting')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'targeting'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <Target className="w-4 h-4" />
          {t('nav.targeting_performance') || 'Targeting'}
        </button>
        <button
          onClick={() => setActiveTab('creatives')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'creatives'
              ? 'bg-green-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <Image className="w-4 h-4" />
          {t('nav.creative_performance') || 'Creatives'}
        </button>
      </div>

      {/* Date Filter - Shared across all tabs */}
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

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <>
          {/* Quick Guide - Hierarchy explanation */}
          <div
            className="flex items-start gap-3 p-4 mb-6 bg-blue-500/5 border border-blue-500/20 rounded-xl group cursor-help"
            dir={isRTL ? 'rtl' : 'ltr'}
            title={t('advanced.hierarchy_tooltip') || 'Campaign → Targeting → Ad. Click the arrow to expand. If a campaign or targeting is paused, all items inside it won\'t run even if they show as active.'}
          >
            <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-gray-300">
              {t('advanced.hierarchy_guide') || 'Campaign → Targeting → Ad. Click the arrow to expand.'}
            </div>
          </div>

          {/* Campaign Control Table */}
          <div className="mb-8">
            <CampaignControlTable
              accountId={selectedAccountId}
              currency={currency}
              locale={locale}
              startDate={startDate || ''}
              endDate={endDate || ''}
              hideActions={true}
            />
          </div>

          {/* Performance Over Time */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-100">{t('common.performance_over_time') || 'Performance Over Time'}</h2>
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
              granularity={granularity}
            />
          </div>

          {/* Breakdown Tabs */}
          <div className="mb-8" ref={breakdownRef}>
            <h2 className={`text-2xl font-bold text-gray-100 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {t('campaigns.breakdown_title') || 'Breakdown'}
            </h2>
            <CreativeBreakdownTabs
              dateRange={dateRange}
              currency={currency}
              isRTL={isRTL}
              accountId={selectedAccountId || undefined}
              creativeIds={null}
              isVisible={isBreakdownVisible}
            />
          </div>
        </>
      )}

      {/* Targeting Tab */}
      {activeTab === 'targeting' && (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">
              {t('targeting.table_title') || 'Ad Sets by Targeting Type'}
            </h2>
            <TargetingTable
              targetingData={targetingData}
              isLoading={isTargetingLoading}
              currency={currency}
              isRTL={isRTL}
              selectedAdsetIds={[]}
              onSelectionChange={() => {}}
              showComparison={false}
            />
          </div>

          {/* Performance Over Time */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-100">{t('common.performance_over_time') || 'Performance Over Time'}</h2>
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
              granularity={granularity}
            />
          </div>

          {/* Breakdown Tabs */}
          <div className="mb-8" ref={breakdownRef}>
            <h2 className={`text-2xl font-bold text-gray-100 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {t('campaigns.breakdown_title') || 'Breakdown'}
            </h2>
            <CreativeBreakdownTabs
              dateRange={dateRange}
              currency={currency}
              isRTL={isRTL}
              accountId={selectedAccountId || undefined}
              creativeIds={null}
              isVisible={isBreakdownVisible}
            />
          </div>
        </>
      )}

      {/* Creatives Tab */}
      {activeTab === 'creatives' && (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">
              {t('creatives.all_creatives') || 'All Creatives'}
            </h2>
            <CreativesTable
              creatives={creatives}
              isLoading={isCreativesLoading}
              currency={currency}
              isRTL={isRTL}
              dateRange={dateRange}
              accountId={selectedAccountId}
              selectedCreativeIds={[]}
              onSelectionChange={() => {}}
              showComparison={false}
            />
          </div>

          {/* Performance Over Time */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-100">{t('common.performance_over_time') || 'Performance Over Time'}</h2>
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
              granularity={granularity}
            />
          </div>

          {/* Breakdown Tabs */}
          <div className="mb-8" ref={breakdownRef}>
            <h2 className={`text-2xl font-bold text-gray-100 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {t('campaigns.breakdown_title') || 'Breakdown'}
            </h2>
            <CreativeBreakdownTabs
              dateRange={dateRange}
              currency={currency}
              isRTL={isRTL}
              accountId={selectedAccountId || undefined}
              creativeIds={null}
              isVisible={isBreakdownVisible}
            />
          </div>
        </>
      )}
    </MainLayout>
  );
}
