/**
 * Campaigns API Service
 * Handles all API calls for the Campaign Performance Analysis page
 */

import { apiClient } from './apiClient';
import { CampaignRow, BreakdownRow, TimeGranularity, BreakdownType, DateRange } from '../types/campaigns.types';

/**
 * Fetch campaigns for a specific date range
 */
async function fetchCampaigns(dateRange: DateRange): Promise<any[]> {
  const { startDate, endDate } = dateRange;
  try {
    const response = await apiClient.get<any[]>('/api/v1/metrics/campaigns', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  } catch (error) {
    console.error('[Campaigns Service] Error fetching campaigns:', error);
    throw error;
  }
}

/**
 * Fetch campaigns with automatic previous period comparison using the unified backend endpoint
 */
export async function fetchCampaignsWithComparison(
  dateRange: DateRange,
  status: string[] = [],
  searchQuery: string = '',
  sortBy: string = 'spend',
  sortDirection: 'asc' | 'desc' = 'desc'
): Promise<CampaignRow[]> {
  const { startDate, endDate } = dateRange;

  const params: any = {
    start_date: startDate,
    end_date: endDate,
    sort_by: sortBy,
    sort_direction: sortDirection,
    limit: '100',
  };

  if (status.length > 0) {
    // Axios handles array params correctly if configured, but let's be explicit if needed
    // Typically Axios standard is `status[]`, but backend might expect `status` multiple times.
    // FastAPI standard handles `status` multiple times. 
    // We can pass paramsSerializer to Axios if needed, but default usually works for simple arrays.
    // The previous implementation used URLSearchParams which repeats the key.
    // Let's rely on Axios default behavior first, assuming standard array serialization.
    // If FastAPI needs repeated keys (e.g. ?status=ACTIVE&status=PAUSED), we might need `paramsSerializer`.
    // For safety, let's stick to simple object here and let Axios handle it. 
    // If it fails, we'll fix serialization.
    params.status = status;
  }

  if (searchQuery) {
    params.search = searchQuery;
  }

  try {
    const response = await apiClient.get<CampaignRow[]>('/api/v1/metrics/campaigns/comparison', {
      params,
      paramsSerializer: {
        indexes: null // Result: status=ACTIVE&status=PAUSED (no brackets) - Correct for FastAPI
      }
    });

    return response.data;
  } catch (error) {
    console.error('[Campaigns Service] Error fetching campaigns with comparison:', error);
    throw error;
  }
}

/**
 * Fetch time-series trend data with granularity
 */
export async function fetchTrendData(
  dateRange: DateRange,
  granularity: TimeGranularity = 'day'
): Promise<any[]> {
  const { startDate, endDate } = dateRange;
  try {
    const response = await apiClient.get<any[]>('/api/v1/metrics/trend', {
      params: {
        start_date: startDate,
        end_date: endDate,
        granularity,
      },
    });
    return response.data;
  } catch (error) {
    console.error('[Campaigns Service] Error fetching trend data:', error);
    throw error;
  }
}

/**
 * Fetch breakdown data (placement, demographics, or country)
 */
export async function fetchBreakdown(
  dateRange: DateRange,
  breakdownType: BreakdownType,
  groupBy: 'age' | 'gender' | 'both' = 'both',
  status: string[] = [],
  searchQuery: string = ''
): Promise<BreakdownRow[]> {
  const { startDate, endDate } = dateRange;

  // Map breakdown type to API endpoint
  const endpointMap: Record<BreakdownType, string> = {
    'placement': '/api/v1/metrics/breakdowns/placement',
    'platform': '/api/v1/metrics/breakdowns/platform',
    'age-gender': '/api/v1/metrics/breakdowns/age-gender',
    'country': '/api/v1/metrics/breakdowns/country',
    'adset': '/api/v1/metrics/breakdowns/adset',
  };

  const endpoint = endpointMap[breakdownType];

  const params: any = {
    start_date: startDate,
    end_date: endDate
  };

  if (breakdownType === 'age-gender') {
    params.group_by = groupBy;
  }

  if (status.length > 0) {
    params.status = status;
  }

  if (searchQuery) {
    params.search = searchQuery;
  }

  try {
    const response = await apiClient.get(endpoint, {
      params,
      paramsSerializer: {
        indexes: null // Correct for FastAPI repeated params
      }
    });

    const data = response.data;

    // Map backend response to BreakdownRow format
    return data.map((item: any) => {
      let name = 'Unknown';
      if (breakdownType === 'adset') name = item.adset_name || 'Unknown Adset';
      else if (breakdownType === 'platform') name = item.platform || item.placement_name || 'Instagram';
      else if (breakdownType === 'placement') name = item.placement_name || 'Unknown Placement';
      else if (breakdownType === 'age-gender') {
        const age = item.age_group || item.age;
        const gender = item.gender;
        name = (age && gender && gender !== 'All' && age !== 'All')
          ? `${age} | ${gender}`
          : (age !== 'All' ? age : (gender !== 'All' ? gender : 'Unknown'));
      }
      else if (breakdownType === 'country') name = item.country || 'Unknown';

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
        adset_id: item.adset_id,
        targeting_type: item.targeting_type,
        targeting_summary: item.targeting_summary,
      };
    });
  } catch (error) {
    console.error('[Campaigns Service] Error fetching breakdown data:', error);
    throw error;
  }
}

/**
 * Export data to Google Sheets
 */
export async function exportToSheets(dateRange: DateRange): Promise<{ url: string }> {
  const { startDate, endDate } = dateRange;
  try {
    const response = await apiClient.post<{ spreadsheet_url: string }>('/api/v1/export/google-sheets', {
      start_date: startDate,
      end_date: endDate,
      report_type: 'campaigns',
    });
    return { url: response.data.spreadsheet_url };
  } catch (error) {
    console.error('[Campaigns Service] Error exporting to Google Sheets:', error);
    throw error;
  }
}

/**
 * Export data to Excel (.xlsx download)
 */
export async function exportToExcel(dateRange: DateRange): Promise<Blob> {
  const { startDate, endDate } = dateRange;
  try {
    const response = await apiClient.post('/api/v1/export/excel', {
      start_date: startDate,
      end_date: endDate,
      report_type: 'campaigns',
    }, {
      responseType: 'blob' // Important for file download
    });
    return response.data;
  } catch (error) {
    console.error('[Campaigns Service] Error exporting to Excel:', error);
    throw error;
  }
}
