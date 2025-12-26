/**
 * Campaigns API Service
 * Handles all API calls for the Campaign Performance Analysis page
 */

import { CampaignRow, BreakdownRow, TimeGranularity, BreakdownType, DateRange } from '../types/campaigns.types';
import { getPreviousPeriod } from '../utils/date';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Fetch campaigns for a specific date range
 */
async function fetchCampaigns(dateRange: DateRange): Promise<any[]> {
  const { startDate, endDate } = dateRange;
  const url = `${API_BASE_URL}/api/v1/metrics/campaigns?start_date=${startDate}&end_date=${endDate}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
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

  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    sort_by: sortBy,
    sort_direction: sortDirection,
    limit: '100',
  });

  if (status.length > 0) {
    status.forEach((s) => params.append('status', s));
  }

  if (searchQuery) {
    params.append('search', searchQuery);
  }

  const url = `${API_BASE_URL}/api/v1/metrics/campaigns/comparison?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: CampaignRow[] = await response.json();
    return data;
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
  const url = `${API_BASE_URL}/api/v1/metrics/trend?start_date=${startDate}&end_date=${endDate}&granularity=${granularity}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
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
  groupBy: 'age' | 'gender' | 'both' = 'both'
): Promise<BreakdownRow[]> {
  const { startDate, endDate } = dateRange;

  // Map breakdown type to API endpoint
  const endpointMap: Record<BreakdownType, string> = {
    'placement': '/api/v1/breakdowns/placement',
    'platform': '/api/v1/metrics/breakdowns/platform',
    'age-gender': '/api/v1/metrics/breakdowns/age-gender',
    'country': '/api/v1/breakdowns/country',
    'adset': '/api/v1/breakdowns/adset',
  };

  const endpoint = endpointMap[breakdownType];
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  url.searchParams.append('start_date', startDate);
  url.searchParams.append('end_date', endDate);

  if (breakdownType === 'age-gender') {
    url.searchParams.append('group_by', groupBy);
  }

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

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
        purchases: item.purchases || 0,
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
  const url = `${API_BASE_URL}/api/v1/export/google-sheets`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        report_type: 'campaigns',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { url: data.spreadsheet_url };
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
  const url = `${API_BASE_URL}/api/v1/export/excel`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        report_type: 'campaigns',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('[Campaigns Service] Error exporting to Excel:', error);
    throw error;
  }
}
