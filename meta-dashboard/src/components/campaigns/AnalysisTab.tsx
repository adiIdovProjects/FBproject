"use client";

/**
 * AnalysisTab Component
 * Full campaign performance analysis - reuses components from the campaigns page.
 * Embedded inside Campaign Control as a tab.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Search, Filter, X } from 'lucide-react';

import DateFilter from '../DateFilter';
import ActionsMetricsChart from '../dashboard/ActionsMetricsChart';
import TimeGranularityToggle from './TimeGranularityToggle';
import CampaignsTable from './CampaignsTable';
import BreakdownTabs from './BreakdownTabs';
import CampaignComparisonModal from './CampaignComparisonModal';
import { useInView } from '../../hooks/useInView';

import { fetchCampaignsWithComparison, fetchTrendData } from '../../services/campaigns.service';
import { CampaignRow, TimeGranularity, CampaignMetrics, DateRange } from '../../types/campaigns.types';
import { MetricType } from '../../types/dashboard.types';
import { useAccount } from '../../context/AccountContext';
import { formatDate, calculateDateRange } from '../../utils/date';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

interface AnalysisTabProps {
  accountId: string;
}

export default function AnalysisTab({ accountId }: AnalysisTabProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';
  const { hasROAS } = useAccount();

  // Date range
  const initialDates = useMemo(() => calculateDateRange(DEFAULT_DATE_RANGE_KEY), []);
  const [startDate, setStartDate] = useState<string>(
    formatDate(initialDates.start) || formatDate(new Date()) || ''
  );
  const [endDate, setEndDate] = useState<string>(
    formatDate(initialDates.end) || formatDate(new Date()) || ''
  );

  // Chart state
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('spend');
  const [granularity, setGranularity] = useState<TimeGranularity>('week');

  // Data state
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [currency, setCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState(false);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Filters
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  // Selection and filtering
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<number[]>([]);
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [filteredCampaignIds, setFilteredCampaignIds] = useState<number[]>([]);

  // Lazy loading for breakdown
  const [breakdownRef, isBreakdownVisible] = useInView();
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchValue), 500);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Fetch campaigns
  useEffect(() => {
    const fetchData = async () => {
      if (!startDate || !endDate) return;
      setIsLoading(true);
      setError(null);

      try {
        const dateRange: DateRange = { startDate, endDate };
        const [campaignsData, overviewData] = await Promise.all([
          fetchCampaignsWithComparison(dateRange, statusFilter, searchQuery, undefined, undefined, accountId),
          fetch(`${API_BASE_URL}/api/v1/metrics/overview?start_date=${startDate}&end_date=${endDate}${accountId ? `&account_id=${accountId}` : ''}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        ]);
        setCampaigns(campaignsData);
        if (overviewData?.currency) setCurrency(overviewData.currency);
      } catch (err: any) {
        console.error('[AnalysisTab] Error fetching campaigns:', err);
        setError(err.message || 'Failed to fetch campaigns');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate, statusFilter, searchQuery, accountId]);

  // Fetch trend data
  useEffect(() => {
    const fetchTrend = async () => {
      if (!startDate || !endDate) return;
      setIsTrendLoading(true);
      try {
        const dateRange: DateRange = { startDate, endDate };
        const data = await fetchTrendData(
          dateRange, granularity, accountId, null,
          isFilterActive ? filteredCampaignIds : null
        );
        setTrendData(data || []);
      } catch (err: any) {
        console.error('[AnalysisTab] Error fetching trend data:', err);
      } finally {
        setIsTrendLoading(false);
      }
    };
    fetchTrend();
  }, [startDate, endDate, granularity, accountId, isFilterActive, filteredCampaignIds]);

  // Chart data
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

  const handleDateRangeChange = useCallback((start: string | null, end: string | null) => {
    if (start && start !== startDate) setStartDate(start);
    if (end && end !== endDate) setEndDate(end);
  }, [startDate, endDate]);

  return (
    <>
      {/* Filters Row */}
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
            <div className="relative">
              <Filter className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500`} />
              <select
                value={statusFilter[0] || ''}
                onChange={(e) => setStatusFilter(e.target.value ? [e.target.value] : [])}
                className={`bg-card-bg/40 border border-border-subtle rounded-xl py-2.5 ${isRTL ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8'} text-sm text-white focus:border-accent/50 outline-none transition-all appearance-none cursor-pointer min-w-[140px]`}
              >
                <option value="" className="bg-gray-900 text-white">{t('common.all_statuses')}</option>
                <option value="ACTIVE" className="bg-gray-900 text-white">{t('status.ACTIVE')}</option>
                <option value="PAUSED" className="bg-gray-900 text-white">{t('status.PAUSED')}</option>
                <option value="ARCHIVED" className="bg-gray-900 text-white">{t('status.ARCHIVED')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedCampaignIds.length > 0 && !isFilterActive && (
            <button
              onClick={() => { setIsFilterActive(true); setFilteredCampaignIds(selectedCampaignIds); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filter ({selectedCampaignIds.length})</span>
            </button>
          )}
          {isFilterActive && (
            <button
              onClick={() => { setIsFilterActive(false); setFilteredCampaignIds([]); setSelectedCampaignIds([]); }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Clear Filter</span>
            </button>
          )}
          {selectedCampaignIds.length >= 2 && selectedCampaignIds.length <= 5 && !isFilterActive && (
            <button
              onClick={() => setShowComparisonModal(true)}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
            >
              <span>Compare ({selectedCampaignIds.length})</span>
            </button>
          )}
          <div className="flex items-center gap-2 bg-card-bg/40 border border-border-subtle rounded-xl px-4 py-2.5" dir="ltr">
            <span className="text-sm text-gray-400">{t('common.compare_periods') || 'Compare Periods'}</span>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 ${showComparison ? 'bg-accent' : 'bg-gray-700'}`}
            >
              <span className="sr-only">Enable comparison</span>
              <span className={`${showComparison ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-400 text-red-300 rounded-xl">
          <p className="font-bold">{t('common.error_loading')}</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-100 mb-4">
          {isFilterActive ? `Filtered Campaigns (${filteredCampaignIds.length})` : t('campaigns.table_title')}
        </h2>
        <CampaignsTable
          campaigns={isFilterActive && filteredCampaignIds.length > 0
            ? campaigns.filter(c => filteredCampaignIds.includes(c.campaign_id))
            : campaigns
          }
          isLoading={isLoading}
          currency={currency}
          isRTL={isRTL}
          showComparison={showComparison}
          selectedCampaignIds={selectedCampaignIds}
          onSelectionChange={setSelectedCampaignIds}
        />
      </div>

      {/* Performance Chart */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-100">{t('campaigns.chart_title')}</h2>
            {isFilterActive && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Filtered ({filteredCampaignIds.length} campaigns)
              </span>
            )}
          </div>
          <TimeGranularityToggle selected={granularity} onChange={setGranularity} isRTL={isRTL} />
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

      {/* Breakdown Analysis */}
      <div className="mb-8" ref={breakdownRef}>
        <h2 className="text-2xl font-bold text-gray-100 mb-4">{t('campaigns.breakdown_title')}</h2>
        <BreakdownTabs
          dateRange={{ startDate, endDate }}
          currency={currency}
          isRTL={isRTL}
          statusFilter={statusFilter}
          searchQuery={searchQuery}
          accountId={accountId}
          campaignIds={isFilterActive ? filteredCampaignIds : null}
          isVisible={isBreakdownVisible}
        />
      </div>

      {/* Campaign Comparison Modal */}
      <CampaignComparisonModal
        campaignIds={selectedCampaignIds}
        campaigns={campaigns}
        dateRange={{ startDate, endDate }}
        accountId={accountId}
        isOpen={showComparisonModal}
        onClose={() => { setShowComparisonModal(false); setSelectedCampaignIds([]); }}
      />
    </>
  );
}
