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
    const response = await apiClient.post('/api/v1/export/excel', exportData, {
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

  // Prepare data for export
  const exportData = {
    title: exportSheetName,
    period1: `${data.period1_start} to ${data.period1_end}`,
    period2: `${data.period2_start} to ${data.period2_end}`,
    dimension: data.dimension,
    data: data.dimension === 'overview' && data.overview ? [data.overview] : data.items,
  };

  try {
    const response = await apiClient.post<{ spreadsheet_url: string }>('/api/v1/export/google-sheets', exportData);
    return response.data.spreadsheet_url;
  } catch (error) {
    console.error('[Reports Service] Error exporting to Google Sheets:', error);
    throw error;
  }
}
