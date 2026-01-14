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
import GoogleConnectModal from '../../../components/reports/GoogleConnectModal';

// Services & Types
import {
  fetchComparisonData,
  ReportsComparisonResponse,
  ComparisonItem,
  exportToExcel,
  exportToGoogleSheets,
  fetchBreakdownReport,
  isSpecialBreakdown,
  isEntityBreakdown,
  getEntityType,
  getSpecialBreakdownType,
  fetchEntityBreakdownReport,
} from '../../../services/reports.service';
import { useAccount } from '../../../context/AccountContext';

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

  // Global Account State
  const { selectedAccountId } = useAccount();

  // UI state
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(true);

  // Data state
  const [comparisonData, setComparisonData] = useState<ReportsComparisonResponse | null>(null);
  const [displayData, setDisplayData] = useState<ComparisonItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google connection modal state
  const [showGoogleConnectModal, setShowGoogleConnectModal] = useState(false);

  // Check if any item has conversion value
  const hasConversionValue = useMemo(() => {
    return displayData.some(item => (item.period1.conversion_value || 0) > 0);
  }, [displayData]);

  // Metrics that require conversion data (not available for special breakdowns)
  const CONVERSION_METRICS: MetricKey[] = ['conversions', 'conversion_value', 'roas', 'cpa', 'conversion_rate'];
  const SPECIAL_BREAKDOWNS = ['placement', 'platform', 'age-gender', 'country'];
  const isCurrentBreakdownSpecial = SPECIAL_BREAKDOWNS.includes(breakdown);
  // Also check if secondary breakdown is special (entity + special combination)
  const hasSpecialSecondary = SPECIAL_BREAKDOWNS.includes(secondaryBreakdown);
  const shouldHideConversionMetrics = isCurrentBreakdownSpecial || hasSpecialSecondary;

  // Remove conversion metrics when switching to special breakdown
  useEffect(() => {
    if (shouldHideConversionMetrics) {
      const filteredMetrics = selectedMetrics.filter(m => !CONVERSION_METRICS.includes(m));
      if (filteredMetrics.length !== selectedMetrics.length) {
        setSelectedMetrics(filteredMetrics);
      }
    }
  }, [breakdown, secondaryBreakdown]);

  // Remove ROAS from selectedMetrics if there's no conversion value
  useEffect(() => {
    if (!hasConversionValue && selectedMetrics.includes('roas')) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== 'roas'));
    }
  }, [hasConversionValue]);

  // Detect post-OAuth return and auto-retry export
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    console.log('[Reports] useEffect - Checking for post-OAuth return');
    console.log('[Reports] URL params:', Object.fromEntries(urlParams.entries()));

    if (urlParams.get('google_connected') === 'true') {
      console.log('[Reports] ✅ Detected post-OAuth return!');

      // Also handle token in URL if present
      const token = urlParams.get('token');
      if (token) {
        console.log('[Reports] Found token in URL, storing...');
        localStorage.setItem('token', token);
      }

      // Clean URL (remove query params)
      window.history.replaceState({}, '', window.location.pathname);

      // Check for pending export in localStorage
      const pendingExport = localStorage.getItem('pendingGoogleSheetsExport');
      console.log('[Reports] Pending export in localStorage:', pendingExport);

      if (pendingExport) {
        try {
          const { timestamp, reportData, exportOptions } = JSON.parse(pendingExport);
          const age = Date.now() - timestamp;
          console.log('[Reports] Pending export age:', age, 'ms');

          // Only retry if < 5 minutes old (prevent stale exports)
          if (age < 5 * 60 * 1000) {
            console.log('[Reports] Auto-retrying export...');
            localStorage.removeItem('pendingGoogleSheetsExport');

            // Auto-retry the export with saved options
            exportToGoogleSheets(reportData, exportOptions)
              .then(url => {
                console.log('[Reports] Auto-retry successful:', url);
                alert(`Successfully exported to Google Sheets: ${url}`);
                window.open(url, '_blank');
              })
              .catch((err) => {
                console.error('[Reports] Auto-retry failed:', err);
                alert('Export failed after connecting. Please try again.');
              });
          } else {
            // Expired, just remove it
            console.log('[Reports] Pending export expired, removing');
            localStorage.removeItem('pendingGoogleSheetsExport');
          }
        } catch (err) {
          console.error('[Reports] Failed to parse pending export:', err);
          localStorage.removeItem('pendingGoogleSheetsExport');
        }
      } else {
        console.log('[Reports] No pending export found in localStorage');
      }
    }
  }, []);

  // Fetch comparison data
  const fetchData = async () => {
    if (!period1Start || !period1End) return;
    if (selectedMetrics.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if this is entity + special breakdown combination (e.g., Campaign + Placement)
      if (isEntityBreakdown(breakdown as any) && isSpecialBreakdown(secondaryBreakdown as any)) {
        const entityType = getEntityType(breakdown as any);
        const specialType = getSpecialBreakdownType(secondaryBreakdown as any);

        if (entityType && specialType) {
          const breakdownData = await fetchEntityBreakdownReport(
            period1Start,
            period1End,
            entityType,
            specialType,
            campaignFilter || undefined
          );

          // Convert to ComparisonItem format for display
          const items: ComparisonItem[] = breakdownData.map((row, idx) => ({
            id: `${breakdown}-${secondaryBreakdown}-${idx}`,
            name: row.name,
            period1: {
              spend: row.spend,
              impressions: row.impressions,
              clicks: row.clicks,
              ctr: row.ctr,
              cpc: row.cpc,
              conversions: row.conversions,
              conversion_value: row.conversion_value,
              roas: row.roas,
              cpa: row.cpa,
              conversion_rate: row.clicks > 0 ? (row.conversions / row.clicks) * 100 : 0,
            },
            period2: {
              spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0,
              conversions: 0, conversion_value: 0, roas: 0, cpa: 0, conversion_rate: 0,
            },
            change_pct: {
              spend: null, impressions: null, clicks: null, ctr: null, cpc: null,
              conversions: null, conversion_value: null, roas: null, cpa: null, conversion_rate: null,
            },
            change_abs: {},
          }));

          setComparisonData({
            dimension: `${breakdown}_${secondaryBreakdown}`,
            period1_start: period1Start,
            period1_end: period1End,
            period2_start: null,
            period2_end: null,
            overview: null,
            items,
            currency: 'USD',
          } as ReportsComparisonResponse);

          setDisplayData(items);
        }
      }
      // Check if this is a special breakdown (placement, demographics, country) as primary
      else if (isSpecialBreakdown(breakdown as any)) {
        const breakdownData = await fetchBreakdownReport(
          period1Start,
          period1End,
          breakdown as 'placement' | 'platform' | 'age-gender' | 'country',
          selectedAccountId || undefined
        );

        // Convert to ComparisonItem format for display
        const items: ComparisonItem[] = breakdownData.map((row, idx) => ({
          id: `${breakdown}-${idx}`,
          name: row.name,
          period1: {
            spend: row.spend,
            impressions: row.impressions,
            clicks: row.clicks,
            ctr: row.ctr,
            cpc: row.cpc,
            conversions: row.conversions,
            conversion_value: row.conversion_value,
            roas: row.roas,
            cpa: row.cpa,
            conversion_rate: row.clicks > 0 ? (row.conversions / row.clicks) * 100 : 0,
          },
          period2: {
            spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0,
            conversions: 0, conversion_value: 0, roas: 0, cpa: 0, conversion_rate: 0,
          },
          change_pct: {
            spend: null, impressions: null, clicks: null, ctr: null, cpc: null,
            conversions: null, conversion_value: null, roas: null, cpa: null, conversion_rate: null,
          },
          change_abs: {},
        }));

        // Create a mock response for consistency
        setComparisonData({
          dimension: breakdown,
          period1_start: period1Start,
          period1_end: period1End,
          period2_start: null,
          period2_end: null,
          overview: null,
          items,
          currency: 'USD',
        } as ReportsComparisonResponse);

        setDisplayData(items);
      } else {
        // Standard comparison data fetch
        const data = await fetchComparisonData({
          period1Start,
          period1End,
          dimension,
          breakdown,
          secondaryBreakdown,
          campaignFilter: campaignFilter || undefined,
          adSetFilter: adSetFilter || undefined,
          adFilter: adFilter || undefined,
          accountId: selectedAccountId || undefined,
        });

        setComparisonData(data);

        // Set display data based on dimension
        if (data.dimension === 'overview' && data.overview) {
          setDisplayData([data.overview]);
        } else {
          setDisplayData(data.items);
        }
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
  }, [period1Start, period1End, selectedAccountId]);

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
      await exportToExcel(comparisonData, {
        breakdown,
        secondaryBreakdown,
        selectedMetrics,
      });
      alert('Export to Excel successful!');
    } catch (error) {
      console.error('Export to Excel failed:', error);
      alert('Export to Excel failed');
    }
  };

  // Handle export to Google Sheets
  const handleExportGoogleSheets = async () => {
    console.log('[Reports] Export to Google Sheets clicked', { hasData: !!comparisonData });

    if (!comparisonData) {
      console.warn('[Reports] No comparison data available');
      return;
    }

    try {
      console.log('[Reports] Calling exportToGoogleSheets...');
      const url = await exportToGoogleSheets(comparisonData, {
        breakdown,
        secondaryBreakdown,
        selectedMetrics,
      });
      console.log('[Reports] Export successful:', url);
      alert(`Exported to Google Sheets: ${url}`);
      window.open(url, '_blank');
    } catch (error: any) {
      console.error('[Reports] Export to Google Sheets failed:', error);
      console.log('[Reports] Error name:', error.name);
      console.log('[Reports] Error message:', error.message);

      // Check if this is the "Google not connected" error
      if (error.name === 'GoogleAuthRequired') {
        console.log('[Reports] Showing Google connect modal');
        setShowGoogleConnectModal(true); // Show modal instead of alert
      } else {
        alert('Export to Google Sheets failed');
      }
    }
  };

  // Handle Google account connection
  const handleGoogleConnect = () => {
    console.log('[Reports] Google connect initiated');

    // Save pending export to localStorage (for auto-retry after OAuth)
    const exportData = {
      timestamp: Date.now(),
      reportData: comparisonData,
      exportOptions: {
        breakdown,
        secondaryBreakdown,
        selectedMetrics,
      }
    };
    localStorage.setItem('pendingGoogleSheetsExport', JSON.stringify(exportData));
    console.log('[Reports] Saved pending export to localStorage:', exportData);

    // Build OAuth URL with return state
    const returnUrl = `/${locale}/reports`;
    const stateData = {
      csrf: Math.random().toString(36).substring(2),
      return_to: returnUrl
    };
    const stateParam = encodeURIComponent(JSON.stringify(stateData));

    // Get API base URL from environment or default to localhost
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const oauthUrl = `${apiBaseUrl}/api/v1/auth/google/login?state=${stateParam}`;

    console.log('[Reports] Redirecting to OAuth URL:', oauthUrl);
    console.log('[Reports] State data:', stateData);

    // Redirect to backend OAuth
    window.location.href = oauthUrl;
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


              </div>

              <div className="p-6">
                {viewMode === 'table' ? (
                  <ComparisonTable
                    data={displayData}
                    selectedMetrics={selectedMetrics}
                    breakdown={breakdown}
                    secondaryBreakdown={secondaryBreakdown}
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

      {/* Google Connect Modal */}
      <GoogleConnectModal
        isOpen={showGoogleConnectModal}
        onClose={() => setShowGoogleConnectModal(false)}
        onConnect={handleGoogleConnect}
        locale={locale}
      />
    </MainLayout>
  );
}
