/**
 * Insights API Service
 * Handles API calls for insights endpoints
 */

import { apiClient } from './apiClient';

export interface InsightItem {
  type: string;
  icon: string;
  text: string;
  priority?: string | null;
}

export interface InsightsSummaryResponse {
  insights: InsightItem[];
  generated_at: string;
}

export interface DeepInsightsResponse {
  executive_summary: string;
  key_findings: InsightItem[];
  performance_trends: InsightItem[];
  recommendations: InsightItem[];
  opportunities: InsightItem[];
  generated_at: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface InsightsFilters {
  campaignFilter?: string;
  breakdownType?: 'adset' | 'platform' | 'placement' | 'age-gender' | 'country';
  breakdownGroupBy?: 'age' | 'gender' | 'both';
}

/**
 * Fetch summary insights for mini cards on dashboard pages.
 * Supports filtering by campaign name and breakdown analysis.
 */
export async function fetchInsightsSummary(
  dateRange: DateRange,
  pageContext: 'dashboard' | 'campaigns' | 'creatives' = 'dashboard',
  filters?: InsightsFilters
): Promise<InsightItem[]> {
  try {
    const params: any = {
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
      page_context: pageContext
    };

    // Add optional filters
    if (filters?.campaignFilter) {
      params.campaign_filter = filters.campaignFilter;
    }
    if (filters?.breakdownType) {
      params.breakdown_type = filters.breakdownType;
      params.breakdown_group_by = filters.breakdownGroupBy || 'both';
    }

    const response = await apiClient.get<InsightsSummaryResponse>('/api/v1/insights/summary', {
      params
    });

    return response.data.insights;
  } catch (error) {
    console.error('[Insights Service] Error fetching summary insights:', error);
    // Return empty array on error - component will handle gracefully
    return [];
  }
}

/**
 * Fetch deep analysis insights for dedicated insights page
 */
export async function fetchDeepInsights(
  dateRange: DateRange
): Promise<DeepInsightsResponse | null> {
  try {
    const response = await apiClient.get<DeepInsightsResponse>('/api/v1/insights/deep-analysis', {
      params: {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      }
    });
    return response.data;
  } catch (error) {
    console.error('[Insights Service] Error fetching deep insights:', error);
    throw error;
  }
}
