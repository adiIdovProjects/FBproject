/**
 * Reports API Service
 * Handles API calls for reports comparison endpoints and custom reports
 */

import { apiClient } from './apiClient';
import { BreakdownRow } from '../types/campaigns.types';

// ============================================================
// Report Breakdown Types
// ============================================================

export type ReportBreakdown =
  | 'none'
  | 'date'
  | 'week'
  | 'month'
  | 'campaign_name'
  | 'ad_set_name'
  | 'ad_name'
  | 'placement'
  | 'platform'
  | 'age'
  | 'gender'
  | 'country';

export type ReportTemplateId =
  | 'daily'
  | 'weekly'
  | 'campaign'
  | 'adset'
  | 'placement'
  | 'demographics'
  | 'geographic';

export interface ReportTemplate {
  id: ReportTemplateId;
  labelKey: string;
  icon: string;
  primaryBreakdown: ReportBreakdown;
  secondaryBreakdown: ReportBreakdown;
}

export interface ReportConfig {
  primaryBreakdown: ReportBreakdown;
  secondaryBreakdown: ReportBreakdown;
  campaignFilter?: string;
  adSetFilter?: string;
  adFilter?: string;
}

export interface SavedReport {
  id: string;
  name: string;
  config: ReportConfig;
  created_at: string;
}

// ============================================================
// Existing Types (unchanged)
// ============================================================

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
  // Optional detailed metrics
  purchases?: number;
  purchase_value?: number;
  leads?: number;
  add_to_cart?: number;
  video_plays?: number;
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
  // Multi-dimensional breakdown values (for 2D/3D reports)
  primary_value?: string;
  secondary_value?: string;
  tertiary_value?: string;
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
  secondaryBreakdown?: 'none' | 'campaign_name' | 'ad_set_name' | 'ad_name' | 'date' | 'week' | 'month' | 'placement' | 'platform' | 'age' | 'gender' | 'country';
  tertiaryBreakdown?: 'none' | 'campaign_name' | 'ad_set_name' | 'ad_name' | 'date' | 'week' | 'month' | 'placement' | 'platform' | 'age' | 'gender' | 'country';
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
    tertiary_breakdown: params.tertiaryBreakdown || 'none',
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

// Helper to parse item name into primary/secondary breakdown values
function parseItemName(name: string, hasSecondaryBreakdown: boolean): { primary: string; secondary: string } {
  if (hasSecondaryBreakdown && name.includes(' - ')) {
    const parts = name.split(' - ');
    return {
      primary: parts[0] || name,
      secondary: parts.slice(1).join(' - ') || ''
    };
  }
  return { primary: name, secondary: '' };
}

// Helper to get breakdown column header label
function getBreakdownLabel(type: string): string {
  const labels: Record<string, string> = {
    'campaign_name': 'Campaign',
    'ad_set_name': 'Ad Set',
    'ad_name': 'Ad',
    'date': 'Date',
    'week': 'Week',
    'month': 'Month',
    'none': 'Name'
  };
  return labels[type] || 'Name';
}

// Helper to get metric label
function getMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    'spend': 'Spend',
    'impressions': 'Impressions',
    'clicks': 'Clicks',
    'ctr': 'CTR (%)',
    'cpc': 'CPC',
    'cpm': 'CPM',
    'conversions': 'Conversions',
    'conversion_value': 'Conv. Value',
    'roas': 'ROAS',
    'cpa': 'CPA',
    'conversion_rate': 'Conv. Rate (%)'
  };
  return labels[metric] || metric;
}

export interface ExportOptions {
  breakdown?: string;
  secondaryBreakdown?: string;
  selectedMetrics?: string[];
}

/**
 * Export comparison data to Excel
 */
export async function exportToExcel(
  data: ReportsComparisonResponse,
  options?: ExportOptions,
  filename?: string
): Promise<void> {
  const exportFilename = filename || `reports_${new Date().toISOString().split('T')[0]}.xlsx`;
  const breakdown = options?.breakdown || 'none';
  const secondaryBreakdown = options?.secondaryBreakdown || 'none';
  const selectedMetrics = options?.selectedMetrics || ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'conversions', 'cpa', 'roas'];
  const hasSecondaryBreakdown = secondaryBreakdown !== 'none';

  // Get items to export
  const items = data.dimension === 'overview' && data.overview ? [data.overview] : data.items;

  // Build flat data with proper columns
  const flatData = items.map(item => {
    const parsed = parseItemName(item.name, hasSecondaryBreakdown);
    const row: Record<string, any> = {};

    // Add primary breakdown column
    row[getBreakdownLabel(breakdown)] = parsed.primary;

    // Add secondary breakdown column if applicable
    if (hasSecondaryBreakdown) {
      row[getBreakdownLabel(secondaryBreakdown)] = parsed.secondary;
    }

    // Add only the selected metrics
    selectedMetrics.forEach(metric => {
      const value = item.period1[metric as keyof typeof item.period1];
      row[getMetricLabel(metric)] = value ?? 0;
    });

    return row;
  });

  // Prepare data for export
  const exportData = {
    title: `Report (${data.period1_start} to ${data.period1_end})`,
    data: flatData,
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
  options?: ExportOptions,
  sheetName?: string
): Promise<string> {
  const exportSheetName = sheetName || `Reports ${new Date().toISOString().split('T')[0]}`;
  const breakdown = options?.breakdown || 'none';
  const secondaryBreakdown = options?.secondaryBreakdown || 'none';
  const selectedMetrics = options?.selectedMetrics || ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'conversions', 'cpa', 'roas'];
  const hasSecondaryBreakdown = secondaryBreakdown !== 'none';

  // Get items to export
  const items = data.dimension === 'overview' && data.overview ? [data.overview] : data.items;

  // Build flat data with proper columns (matching table structure)
  const flatData = items.map(item => {
    const parsed = parseItemName(item.name, hasSecondaryBreakdown);
    const row: Record<string, any> = {};

    // Add primary breakdown column
    row[getBreakdownLabel(breakdown)] = parsed.primary;

    // Add secondary breakdown column if applicable
    if (hasSecondaryBreakdown) {
      row[getBreakdownLabel(secondaryBreakdown)] = parsed.secondary;
    }

    // Add only the selected metrics
    selectedMetrics.forEach(metric => {
      const value = item.period1[metric as keyof typeof item.period1];
      row[getMetricLabel(metric)] = value ?? 0;
    });

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

// ============================================================
// Custom Reports Functions
// ============================================================

/**
 * Fetch breakdown report for placement, platform, demographics, or country
 * These use separate breakdown endpoints
 */
export async function fetchBreakdownReport(
  startDate: string,
  endDate: string,
  breakdownType: 'placement' | 'platform' | 'age' | 'gender' | 'country',
  accountId?: string
): Promise<BreakdownRow[]> {
  // Map age/gender to the same endpoint with different group_by
  const endpointMap: Record<string, string> = {
    'placement': '/api/v1/metrics/breakdowns/placement',
    'platform': '/api/v1/metrics/breakdowns/platform',
    'age': '/api/v1/metrics/breakdowns/age-gender',
    'gender': '/api/v1/metrics/breakdowns/age-gender',
    'country': '/api/v1/metrics/breakdowns/country',
  };

  const endpoint = endpointMap[breakdownType];
  const params: Record<string, string> = {
    start_date: startDate,
    end_date: endDate,
  };

  if (accountId) {
    params.account_id = accountId;
  }

  // For age/gender, use the group_by parameter
  if (breakdownType === 'age') {
    params.group_by = 'age';
  } else if (breakdownType === 'gender') {
    params.group_by = 'gender';
  }

  try {
    const response = await apiClient.get(endpoint, { params });
    const data = response.data;

    return data.map((item: any) => {
      let name = 'Unknown';
      if (breakdownType === 'platform') {
        name = item.platform || item.placement_name || 'Unknown';
      } else if (breakdownType === 'placement') {
        name = item.placement_name || 'Unknown';
      } else if (breakdownType === 'age') {
        name = item.age_group || item.age || 'Unknown';
      } else if (breakdownType === 'gender') {
        name = item.gender || 'Unknown';
      } else if (breakdownType === 'country') {
        name = item.country || 'Unknown';
      }

      return {
        name,
        spend: item.spend || 0,
        clicks: item.clicks || 0,
        impressions: item.impressions || 0,
        ctr: item.ctr || 0,
        cpc: item.cpc || 0,
        conversions: item.conversions || 0,
        conversion_value: item.conversion_value || 0,
        roas: item.roas || 0,
        cpa: item.cpa || 0,
      };
    });
  } catch (error) {
    console.error('[Reports Service] Error fetching breakdown report:', error);
    throw error;
  }
}

/**
 * Check if breakdown type uses special breakdown endpoints
 */
export function isSpecialBreakdown(breakdown: ReportBreakdown): boolean {
  return ['placement', 'platform', 'age', 'gender', 'country'].includes(breakdown);
}

/**
 * Fetch entity-grouped breakdown report (e.g., Campaign x Placement)
 * This is for 2-dimensional reports: Entity + Special Breakdown
 */
export async function fetchEntityBreakdownReport(
  startDate: string,
  endDate: string,
  entityType: 'campaign' | 'adset' | 'ad',
  breakdownType: 'placement' | 'platform' | 'age' | 'gender' | 'country',
  searchQuery?: string,
  accountId?: string
): Promise<BreakdownRow[]> {
  // Map age/gender to demographics endpoint
  const endpointMap: Record<string, string> = {
    'placement': '/api/v1/breakdowns/placement/by-entity',
    'platform': '/api/v1/breakdowns/platform/by-entity',
    'age': '/api/v1/breakdowns/demographics/by-entity',
    'gender': '/api/v1/breakdowns/demographics/by-entity',
    'country': '/api/v1/breakdowns/country/by-entity',
  };

  const endpoint = endpointMap[breakdownType];
  const params: Record<string, string> = {
    start_date: startDate,
    end_date: endDate,
    entity_type: entityType,
  };

  if (searchQuery) {
    params.search_query = searchQuery;
  }

  if (accountId) {
    params.account_id = accountId;
  }

  // Add group_by for age/gender filtering
  if (breakdownType === 'age') {
    params.group_by = 'age';
  } else if (breakdownType === 'gender') {
    params.group_by = 'gender';
  }

  try {
    const response = await apiClient.get(endpoint, { params });
    const data = response.data;

    return data.map((item: any) => {
      // Build name combining entity + breakdown value
      let breakdownValue = 'Unknown';
      if (breakdownType === 'placement') {
        breakdownValue = item.placement_name || 'Unknown';
      } else if (breakdownType === 'platform') {
        breakdownValue = item.platform || 'Unknown';
      } else if (breakdownType === 'age') {
        breakdownValue = item.age_group || 'Unknown';
      } else if (breakdownType === 'gender') {
        breakdownValue = item.gender || 'Unknown';
      } else if (breakdownType === 'country') {
        breakdownValue = item.country || 'Unknown';
      }

      const name = `${item.entity_name} - ${breakdownValue}`;

      return {
        name,
        spend: item.spend || 0,
        clicks: item.clicks || 0,
        impressions: item.impressions || 0,
        ctr: item.ctr || 0,
        cpc: item.cpc || 0,
        conversions: 0, // Not available for special breakdowns
        conversion_value: 0,
        roas: 0,
        cpa: 0,
      };
    });
  } catch (error) {
    console.error('[Reports Service] Error fetching entity breakdown report:', error);
    throw error;
  }
}

/**
 * Helper to determine if entity type
 */
export function isEntityBreakdown(breakdown: ReportBreakdown): boolean {
  return ['campaign_name', 'ad_set_name', 'ad_name'].includes(breakdown);
}

/**
 * Get entity type from breakdown
 */
export function getEntityType(breakdown: ReportBreakdown): 'campaign' | 'adset' | 'ad' | null {
  const map: Record<string, 'campaign' | 'adset' | 'ad'> = {
    'campaign_name': 'campaign',
    'ad_set_name': 'adset',
    'ad_name': 'ad',
  };
  return map[breakdown] || null;
}

/**
 * Get special breakdown type
 */
export function getSpecialBreakdownType(breakdown: ReportBreakdown): 'placement' | 'platform' | 'age' | 'gender' | 'country' | null {
  if (breakdown === 'placement') return 'placement';
  if (breakdown === 'platform') return 'platform';
  if (breakdown === 'age') return 'age';
  if (breakdown === 'gender') return 'gender';
  if (breakdown === 'country') return 'country';
  return null;
}

/**
 * Pre-built report templates
 */
export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'daily', labelKey: 'reports.templates.daily', icon: 'calendar', primaryBreakdown: 'date', secondaryBreakdown: 'none' },
  { id: 'weekly', labelKey: 'reports.templates.weekly', icon: 'calendar-range', primaryBreakdown: 'week', secondaryBreakdown: 'none' },
  { id: 'campaign', labelKey: 'reports.templates.campaign', icon: 'target', primaryBreakdown: 'campaign_name', secondaryBreakdown: 'week' },
  { id: 'adset', labelKey: 'reports.templates.adset', icon: 'layers', primaryBreakdown: 'ad_set_name', secondaryBreakdown: 'none' },
  { id: 'placement', labelKey: 'reports.templates.placement', icon: 'layout', primaryBreakdown: 'placement', secondaryBreakdown: 'none' },
  { id: 'demographics', labelKey: 'reports.templates.demographics', icon: 'users', primaryBreakdown: 'age', secondaryBreakdown: 'gender' },
  { id: 'geographic', labelKey: 'reports.templates.geographic', icon: 'globe', primaryBreakdown: 'country', secondaryBreakdown: 'none' },
];

// ============================================================
// Saved Reports (placeholder - backend to be implemented)
// ============================================================

export async function getSavedReports(): Promise<SavedReport[]> {
  try {
    const response = await apiClient.get<SavedReport[]>('/api/v1/saved-reports');
    return response.data;
  } catch (error) {
    // Return empty array until backend is implemented
    return [];
  }
}

export async function createSavedReport(name: string, config: ReportConfig): Promise<SavedReport> {
  const response = await apiClient.post<SavedReport>('/api/v1/saved-reports', { name, config });
  return response.data;
}

export async function deleteSavedReport(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/saved-reports/${id}`);
}
