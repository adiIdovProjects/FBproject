/**
 * Reports API Service
 * Handles API calls for reports comparison endpoints
 */

import { apiClient } from './apiClient';

export interface MetricsPeriod {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  conversion_value: number;
  roas: number | null;
  cpa: number;
  conversion_rate: number;
}

export interface ChangePercentage {
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  conversions: number | null;
  conversion_value: number | null;
  roas: number | null;
  cpa: number | null;
  conversion_rate: number | null;
}

export interface ComparisonItem {
  id: string;
  name: string;
  period1: MetricsPeriod;
  period2: MetricsPeriod;
  change_pct: ChangePercentage;
  change_abs: Record<string, number>;
}

export interface ReportsComparisonResponse {
  dimension: string;
  period1_start: string;
  period1_end: string;
  period2_start: string;
  period2_end: string;
  overview: ComparisonItem | null;
  items: ComparisonItem[];
  currency: string;
}

export interface ComparisonParams {
  period1Start: string;
  period1End: string;
  period2Start?: string;
  period2End?: string;
  dimension?: 'overview' | 'campaign' | 'ad';
  breakdown?: 'none' | 'campaign_name' | 'ad_set_name' | 'ad_name' | 'date' | 'week' | 'month';
  secondaryBreakdown?: 'none' | 'campaign_name' | 'ad_set_name' | 'ad_name' | 'date' | 'week' | 'month';
  campaignFilter?: string;
  adSetFilter?: string;
  adFilter?: string;
  accountId?: string;
}

/**
 * Fetch comparison report data
 */
export async function fetchComparisonData(
  params: ComparisonParams
): Promise<ReportsComparisonResponse> {
  const queryParams: any = {
    period1_start: params.period1Start,
    period1_end: params.period1End,
    dimension: params.dimension || 'overview',
    breakdown: params.breakdown || 'none',
    secondary_breakdown: params.secondaryBreakdown || 'none',
  };

  if (params.period2Start) {
    queryParams.period2_start = params.period2Start;
  }
  if (params.period2End) {
    queryParams.period2_end = params.period2End;
  }

  if (params.campaignFilter) {
    queryParams.campaign_filter = params.campaignFilter;
  }
  if (params.adSetFilter) {
    queryParams.ad_set_filter = params.adSetFilter;
  }
  if (params.adFilter) {
    queryParams.ad_filter = params.adFilter;
  }
  if (params.accountId) {
    queryParams.account_id = params.accountId;
  }

  try {
    const response = await apiClient.get<ReportsComparisonResponse>('/api/v1/reports/compare', {
      params: queryParams
    });
    return response.data;
  } catch (error) {
    console.error('[Reports Service] Error fetching comparison data:', error);
    throw error;
  }
}

/**
 * Export comparison data to Excel
 */
export async function exportToExcel(
  data: ReportsComparisonResponse,
  filename?: string
): Promise<void> {
  const exportFilename = filename || `reports_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Prepare data for export
  const exportData = {
    title: 'Period Comparison Report',
    period1: `${data.period1_start} to ${data.period1_end}`,
    period2: `${data.period2_start} to ${data.period2_end}`,
    dimension: data.dimension,
    data: data.dimension === 'overview' && data.overview ? [data.overview] : data.items,
  };

  try {
    const response = await apiClient.post('/api/v1/export/excel-generic', exportData, {
      responseType: 'blob'
    });

    // Download the file
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = exportFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('[Reports Service] Error exporting to Excel:', error);
    throw error;
  }
}

/**
 * Export comparison data to Google Sheets
 */
export async function exportToGoogleSheets(
  data: ReportsComparisonResponse,
  sheetName?: string
): Promise<string> {
  const exportSheetName = sheetName || `Reports ${new Date().toISOString().split('T')[0]}`;

  // Transform comparison data into flat rows (just Period 1 data, no comparison)
  const items = data.dimension === 'overview' && data.overview ? [data.overview] : data.items;

  const flatData = items.map(item => {
    const row: any = {};

    // Add ID and Name if available
    if (item.id) row.id = item.id;
    if (item.name) row.name = item.name;

    // Add all metrics from period1 (current period)
    const metrics = item.period1;

    // Core metrics
    if (metrics.spend !== undefined) row.spend = metrics.spend;
    if (metrics.impressions !== undefined) row.impressions = metrics.impressions;
    if (metrics.clicks !== undefined) row.clicks = metrics.clicks;
    if (metrics.conversions !== undefined) row.conversions = metrics.conversions;
    if (metrics.conversion_value !== undefined) row.conversion_value = metrics.conversion_value;

    // Calculated metrics
    if (metrics.ctr !== undefined) row.ctr = metrics.ctr;
    if (metrics.cpc !== undefined) row.cpc = metrics.cpc;
    if (metrics.cpm !== undefined) row.cpm = metrics.cpm;
    if (metrics.roas !== undefined) row.roas = metrics.roas;

    // Additional metrics
    if (metrics.purchases !== undefined) row.purchases = metrics.purchases;
    if (metrics.purchase_value !== undefined) row.purchase_value = metrics.purchase_value;
    if (metrics.leads !== undefined) row.leads = metrics.leads;
    if (metrics.add_to_cart !== undefined) row.add_to_cart = metrics.add_to_cart;
    if (metrics.video_plays !== undefined) row.video_plays = metrics.video_plays;

    return row;
  });

  // Prepare data for export
  const exportData = {
    title: `${exportSheetName} (${data.period1_start} to ${data.period1_end})`,
    data: flatData,
  };

  try {
    const response = await apiClient.post<{ spreadsheet_url: string }>('/api/v1/export/google-sheets-generic', exportData);
    return response.data.spreadsheet_url;
  } catch (error: any) {
    console.error('[Reports Service] Error exporting to Google Sheets:', error);

    // Detect if error is 401 and Google account not connected
    if (error.response?.status === 401 &&
        error.response?.data?.detail?.includes('Google account not connected')) {
      // Throw special error type that UI can detect
      const googleError = new Error('GOOGLE_NOT_CONNECTED');
      googleError.name = 'GoogleAuthRequired';
      throw googleError;
    }

    throw error;
  }
}
