'use client';

/**
 * Reports Page - Tableau-Inspired Analytics
 * Interactive period-to-period comparison with flexible filtering
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { BarChart3, Table as TableIcon, Download, FileText } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import FilterPanel, { DimensionType, BreakdownType } from '../../../components/reports/FilterPanel';
import DateFilter from '../../../components/DateFilter';
import ComparisonTable from '../../../components/reports/ComparisonTable';
import ComparisonChart from '../../../components/reports/ComparisonChart';
import { MetricKey } from '../../../components/reports/MetricPills';

// Services & Types
import {
  fetchComparisonData,
  ReportsComparisonResponse,
  ComparisonItem,
  exportToExcel,
  exportToGoogleSheets,
} from '../../../services/reports.service';

// Utilities
import { formatDate, calculateDateRange } from '../../../utils/date';

const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

export default function ReportsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';

  // Initialize default date ranges (last 30 days vs previous 30 days)
  const initialDates = useMemo(() => calculateDateRange(DEFAULT_DATE_RANGE_KEY), []);
  const [period1Start, setPeriod1Start] = useState<string>(formatDate(initialDates.start) || '');
  const [period1End, setPeriod1End] = useState<string>(formatDate(initialDates.end) || '');

  // Filter state
  const [dimension, setDimension] = useState<DimensionType>('overview');
  const [breakdown, setBreakdown] = useState<BreakdownType>('none');
  const [secondaryBreakdown, setSecondaryBreakdown] = useState<BreakdownType>('none');
  const [campaignFilter, setCampaignFilter] = useState<string>('');
  const [adSetFilter, setAdSetFilter] = useState<string>('');
  const [adFilter, setAdFilter] = useState<string>('');
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['spend', 'ctr', 'roas']);

  // UI state
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(true);

  // Data state
  const [comparisonData, setComparisonData] = useState<ReportsComparisonResponse | null>(null);
  const [displayData, setDisplayData] = useState<ComparisonItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if any item has conversion value
  const hasConversionValue = useMemo(() => {
    return displayData.some(item => (item.period1.conversion_value || 0) > 0);
  }, [displayData]);

  // Remove ROAS from selectedMetrics if there's no conversion value
  useEffect(() => {
    if (!hasConversionValue && selectedMetrics.includes('roas')) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== 'roas'));
    }
  }, [hasConversionValue]);

  // Fetch comparison data
  const fetchData = async () => {
    if (!period1Start || !period1End) return;
    if (selectedMetrics.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchComparisonData({
        period1Start,
        period1End,
        dimension,
        breakdown,
        secondaryBreakdown,
        campaignFilter: campaignFilter || undefined,
        adSetFilter: adSetFilter || undefined,
        adFilter: adFilter || undefined,
      });

      setComparisonData(data);

      // Set display data based on dimension
      if (data.dimension === 'overview' && data.overview) {
        setDisplayData([data.overview]);
      } else {
        setDisplayData(data.items);
      }
    } catch (err: any) {
      console.error('[Reports Page] Error fetching comparison data:', err);
      setError(err.message || 'Failed to fetch comparison data');
      setDisplayData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load & date changes
  useEffect(() => {
    fetchData();
  }, [period1Start, period1End]);

  // Auto-fetch when breakdown or text filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500); // 500ms debounce for text filters

    return () => clearTimeout(timer);
  }, [breakdown, secondaryBreakdown, campaignFilter, adSetFilter, adFilter]);

  // Handle apply filters
  const handleApplyFilters = () => {
    fetchData();
  };

  // Handle reset filters
  const handleResetFilters = () => {
    const initialDates = calculateDateRange(DEFAULT_DATE_RANGE_KEY);
    setPeriod1Start(formatDate(initialDates.start) || '');
    setPeriod1End(formatDate(initialDates.end) || '');

    setDimension('overview');
    setBreakdown('none');
    setSecondaryBreakdown('none');
    setCampaignFilter('');
    setAdSetFilter('');
    setAdFilter('');
    setSelectedMetrics(['spend', 'ctr', 'roas']);
  };

  // Handle date range change
  const handleDateRangeChange = (start: string | null, end: string | null) => {
    if (start) setPeriod1Start(start);
    if (end) setPeriod1End(end);
  };

  // Handle export to Excel
  const handleExportExcel = async () => {
    if (!comparisonData) return;

    try {
      await exportToExcel(comparisonData);
      alert('Export to Excel successful!');
    } catch (error) {
      console.error('Export to Excel failed:', error);
      alert('Export to Excel failed');
    }
  };

  // Handle export to Google Sheets
  const handleExportGoogleSheets = async () => {
    if (!comparisonData) return;

    try {
      const url = await exportToGoogleSheets(comparisonData);
      alert(`Exported to Google Sheets: ${url}`);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Export to Google Sheets failed:', error);
      alert('Export to Google Sheets failed');
    }
  };

  return (
    <MainLayout title={t('reports.title')} description={t('reports.subtitle')}>
      <div className="flex h-[calc(100vh-200px)]">
        {/* Filter Panel (Left Sidebar) */}
        <FilterPanel
          period1Start={period1Start}
          period1End={period1End}
          onPeriod1Change={(start, end) => {
            // This is now handled by DateFilter in the main area,
            // but we keep the prop for internal state sync if needed or remove if possible.
          }}
          dimension={dimension}
          onDimensionChange={setDimension}
          breakdown={breakdown}
          onBreakdownChange={setBreakdown}
          secondaryBreakdown={secondaryBreakdown}
          onSecondaryBreakdownChange={setSecondaryBreakdown}
          campaignFilter={campaignFilter}
          adSetFilter={adSetFilter}
          adFilter={adFilter}
          onCampaignFilterChange={setCampaignFilter}
          onAdSetFilterChange={setAdSetFilter}
          onAdFilterChange={setAdFilter}
          selectedMetrics={selectedMetrics}
          onMetricsChange={setSelectedMetrics}
          isOpen={filterPanelOpen}
          onToggle={() => setFilterPanelOpen(!filterPanelOpen)}
          isRTL={isRTL}
          hasConversionValue={hasConversionValue}
        />

        {/* Visualization Area (Right) */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Header Actions */}
          <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <DateFilter
              startDate={period1Start}
              endDate={period1End}
              onDateRangeChange={handleDateRangeChange}
              lang={locale as any}
              t={t}
              isRTL={isRTL}
            />
          </div>

          {/* Toolbar */}
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* View mode toggle */}
            <div className="flex gap-2 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded transition-colors
                  ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'}
                `}
              >
                <TableIcon className="w-4 h-4" />
                <span>{t('reports.view_as_table')}</span>
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded transition-colors
                  ${viewMode === 'chart' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'}
                `}
              >
                <BarChart3 className="w-4 h-4" />
                <span>{t('reports.view_as_bar_chart')}</span>
              </button>
            </div>

            {/* Export buttons */}
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <button
                onClick={handleExportExcel}
                disabled={!comparisonData || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{t('actions.export_to_excel')}</span>
              </button>
              <button
                onClick={handleExportGoogleSheets}
                disabled={!comparisonData || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{t('actions.export_to_google_sheets')}</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-400 text-red-300 rounded-xl">
              <p className="font-bold">{t('common.error_loading')}</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Data Visualization */}
          {!isLoading && !error && (
            <div className="bg-card-bg/40 border border-border-subtle rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
              <div className={`p-4 border-b border-border-subtle bg-white/5 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-100">
                    {dimension === 'overview' ? t('reports.performance_overview') : t('reports.detailed_breakdown')}
                  </h3>
                </div>

                {comparisonData?.currency && (
                  <span className="text-xs font-mono text-gray-500 bg-gray-800/50 px-2 py-1 rounded">
                    {t('common.currency')}: {comparisonData.currency}
                  </span>
                )}
              </div>

              <div className="p-6">
                {viewMode === 'table' ? (
                  <ComparisonTable
                    data={displayData}
                    selectedMetrics={selectedMetrics}
                    breakdown={breakdown}
                    currency={comparisonData?.currency}
                    isRTL={isRTL}
                  />
                ) : (
                  <ComparisonChart
                    data={displayData}
                    selectedMetrics={selectedMetrics}
                    currency={comparisonData?.currency}
                    isRTL={isRTL}
                  />
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && displayData.length === 0 && (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>No data available. Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
