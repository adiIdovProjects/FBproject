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
import { Info, Eye, Target, Image, Filter } from 'lucide-react';

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
import { fetchTrendData, fetchBreakdown, fetchBreakdownWithComparison } from '../../../services/campaigns.service';
import { fetchCreatives, fetchCreativesWithComparison } from '../../../services/creatives.service';
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

  // Campaigns tab filters
  const [campaignsStatusFilter, setCampaignsStatusFilter] = useState<string>('');

  // Targeting tab state
  const [targetingData, setTargetingData] = useState<TargetingRow[]>([]);
  const [isTargetingLoading, setIsTargetingLoading] = useState(false);
  const [showTargetingComparison, setShowTargetingComparison] = useState(false);
  const [targetingTypeFilter, setTargetingTypeFilter] = useState<string>('');

  // Creatives tab state
  const [creatives, setCreatives] = useState<CreativeMetrics[]>([]);
  const [isCreativesLoading, setIsCreativesLoading] = useState(false);
  const [showCreativesComparison, setShowCreativesComparison] = useState(false);
  const [creativesTypeFilter, setCreativesTypeFilter] = useState<string>('');

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
        const adsetsData = showTargetingComparison
          ? await fetchBreakdownWithComparison(dateRange, 'adset', 'both', [], '', selectedAccountId || undefined)
          : await fetchBreakdown(dateRange, 'adset', 'both', [], '', selectedAccountId || undefined);

        // Apply type filter client-side
        let filteredData = adsetsData;
        if (targetingTypeFilter) {
          filteredData = adsetsData.filter((adset: any) => adset.targeting_type === targetingTypeFilter);
        }
        setTargetingData(filteredData as TargetingRow[]);
      } catch (err) {
        console.error('Error fetching targeting data:', err);
      } finally {
        setIsTargetingLoading(false);
      }
    };
    loadTargeting();
  }, [activeTab, dateRange, selectedAccountId, startDate, endDate, showTargetingComparison, targetingTypeFilter]);

  // Fetch creatives data
  useEffect(() => {
    if (activeTab !== 'creatives' || !startDate || !endDate) return;

    const loadCreatives = async () => {
      setIsCreativesLoading(true);
      try {
        // Convert filter type to API parameter
        const isVideoParam = creativesTypeFilter === 'video' ? true :
          (creativesTypeFilter === 'image' || creativesTypeFilter === 'carousel') ? false : undefined;

        const filter = { dateRange, sort_by: 'spend' as const, is_video: isVideoParam };

        const creativesData = showCreativesComparison
          ? await fetchCreativesWithComparison(filter, selectedAccountId)
          : await fetchCreatives(filter, selectedAccountId);

        // Apply frontend filtering for image vs carousel
        let filteredData = creativesData;
        if (creativesTypeFilter === 'image') {
          filteredData = creativesData.filter(c => !c.is_carousel);
        } else if (creativesTypeFilter === 'carousel') {
          filteredData = creativesData.filter(c => c.is_carousel);
        }
        setCreatives(filteredData);
      } catch (err) {
        console.error('Error fetching creatives:', err);
      } finally {
        setIsCreativesLoading(false);
      }
    };
    loadCreatives();
  }, [activeTab, dateRange, selectedAccountId, startDate, endDate, showCreativesComparison, creativesTypeFilter]);

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
      {/* Tab Navigation - 3 tabs: Campaigns Performance, Targeting, Creatives - Centered */}
      <div className="flex justify-center gap-2 mb-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'campaigns'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          {t('nav.campaigns_performance') || 'Campaigns Performance'}
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
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-100">
                {t('campaigns.title') || 'Campaigns'}
              </h2>
              <div className="flex items-center gap-3">
                {/* Status Filter */}
                <div className="relative">
                  <Filter className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500`} />
                  <select
                    value={campaignsStatusFilter}
                    onChange={(e) => setCampaignsStatusFilter(e.target.value)}
                    className={`bg-card-bg/40 border border-border-subtle rounded-xl py-2.5 ${isRTL ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8'} text-sm text-white focus:border-accent/50 outline-none transition-all appearance-none cursor-pointer min-w-[140px]`}
                  >
                    <option value="" className="bg-gray-900 text-white">{t('common.all_statuses')}</option>
                    <option value="ACTIVE" className="bg-gray-900 text-white">{t('status.ACTIVE')}</option>
                    <option value="PAUSED" className="bg-gray-900 text-white">{t('status.PAUSED')}</option>
                  </select>
                </div>
              </div>
            </div>
            <CampaignControlTable
              accountId={selectedAccountId}
              currency={currency}
              locale={locale}
              startDate={startDate || ''}
              endDate={endDate || ''}
              hideActions={true}
              statusFilter={campaignsStatusFilter}
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
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-100">
                {t('targeting.table_title') || 'Ad Sets by Targeting Type'}
              </h2>
              <div className="flex items-center gap-3">
                {/* Type Filter */}
                <div className="relative">
                  <Filter className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500`} />
                  <select
                    value={targetingTypeFilter}
                    onChange={(e) => setTargetingTypeFilter(e.target.value)}
                    className={`bg-card-bg/40 border border-border-subtle rounded-xl py-2.5 ${isRTL ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8'} text-sm text-white focus:border-accent/50 outline-none transition-all appearance-none cursor-pointer min-w-[140px]`}
                  >
                    <option value="" className="bg-gray-900 text-white">{t('common.all_types')}</option>
                    <option value="Broad" className="bg-gray-900 text-white">{t('targeting.types.Broad')}</option>
                    <option value="Lookalike" className="bg-gray-900 text-white">{t('targeting.types.Lookalike')}</option>
                    <option value="Interest Audience" className="bg-gray-900 text-white">{t('targeting.types.Interest Audience')}</option>
                    <option value="Custom Audience" className="bg-gray-900 text-white">{t('targeting.types.Custom Audience')}</option>
                  </select>
                </div>
                {/* Comparison Toggle */}
                <div className="flex items-center gap-2 bg-card-bg/40 border border-border-subtle rounded-xl px-4 py-2.5" dir="ltr">
                  <span className="text-sm text-gray-400">{t('common.compare_periods')}</span>
                  <button
                    onClick={() => setShowTargetingComparison(!showTargetingComparison)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 ${showTargetingComparison ? 'bg-accent' : 'bg-gray-700'}`}
                  >
                    <span className="sr-only">Enable comparison</span>
                    <span
                      className={`${showTargetingComparison ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </button>
                </div>
              </div>
            </div>
            <TargetingTable
              targetingData={targetingData}
              isLoading={isTargetingLoading}
              currency={currency}
              isRTL={isRTL}
              selectedAdsetIds={[]}
              onSelectionChange={() => {}}
              showComparison={showTargetingComparison}
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
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-100">
                {t('creatives.all_creatives') || 'All Creatives'}
              </h2>
              <div className="flex items-center gap-3">
                {/* Type Filter */}
                <div className="relative">
                  <Filter className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500`} />
                  <select
                    value={creativesTypeFilter}
                    onChange={(e) => setCreativesTypeFilter(e.target.value)}
                    className={`bg-card-bg/40 border border-border-subtle rounded-xl py-2.5 ${isRTL ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8'} text-sm text-white focus:border-accent/50 outline-none transition-all appearance-none cursor-pointer min-w-[140px]`}
                  >
                    <option value="" className="bg-gray-900 text-white">{t('common.all_types')}</option>
                    <option value="video" className="bg-gray-900 text-white">{t('creatives.types.video')}</option>
                    <option value="image" className="bg-gray-900 text-white">{t('creatives.types.image')}</option>
                    <option value="carousel" className="bg-gray-900 text-white">{t('creatives.types.carousel')}</option>
                  </select>
                </div>
                {/* Comparison Toggle */}
                <div className="flex items-center gap-2 bg-card-bg/40 border border-border-subtle rounded-xl px-4 py-2.5" dir="ltr">
                  <span className="text-sm text-gray-400">{t('common.compare_periods')}</span>
                  <button
                    onClick={() => setShowCreativesComparison(!showCreativesComparison)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 ${showCreativesComparison ? 'bg-accent' : 'bg-gray-700'}`}
                  >
                    <span className="sr-only">Enable comparison</span>
                    <span
                      className={`${showCreativesComparison ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </button>
                </div>
              </div>
            </div>
            <CreativesTable
              creatives={creatives}
              isLoading={isCreativesLoading}
              currency={currency}
              isRTL={isRTL}
              dateRange={dateRange}
              accountId={selectedAccountId}
              selectedCreativeIds={[]}
              onSelectionChange={() => {}}
              showComparison={showCreativesComparison}
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
