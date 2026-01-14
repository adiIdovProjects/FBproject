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

// Overview Summary Types
export interface PeriodInsight {
  status: 'ok' | 'no_data';
  insight: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
  period_label: string;
  metrics?: {
    spend: number;
    conversions: number;
    cpa: number | null;
    roas: number | null;
  };
}

export interface ImprovementCheck {
  type: 'learning_phase' | 'pixel' | 'ads_count';
  status: 'warning' | 'good' | 'excellent' | 'critical';
  icon: string;
  message: string;
  adset_id?: number;
}

export interface OverviewSummaryResponse {
  daily: PeriodInsight;
  weekly: PeriodInsight;
  monthly: PeriodInsight;
  improvement_checks: ImprovementCheck[];
  summary: string[];
  generated_at: string;
}

export interface InsightsFilters {
  campaignFilter?: string;
  breakdownType?: 'adset' | 'platform' | 'placement' | 'age-gender' | 'country';
  breakdownGroupBy?: 'age' | 'gender' | 'both';
}

/**
 * Fetch overview summary with daily/weekly/monthly insights, improvement checks, and TL;DR.
 * No date filter needed - uses fixed comparison periods.
 */
export async function fetchOverviewSummary(
  accountId?: string | null,
  locale?: string
): Promise<OverviewSummaryResponse | null> {
  try {
    const params: any = {
      locale: locale || 'en'
    };
    if (accountId) {
      params.account_id = accountId;
    }

    const response = await apiClient.get<OverviewSummaryResponse>(
      '/api/v1/insights/overview-summary',
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('[Insights Service] Error fetching overview summary:', error);
    return null;
  }
}

/**
 * Fetch summary insights for mini cards on dashboard pages.
 * Supports filtering by campaign name and breakdown analysis.
 */
export async function fetchInsightsSummary(
  dateRange: DateRange,
  pageContext: 'dashboard' | 'campaigns' | 'creatives' = 'dashboard',
  filters?: InsightsFilters,
  accountId?: string | null,
  locale?: string
): Promise<InsightItem[]> {
  try {
    const params: any = {
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
      page_context: pageContext,
      locale: locale || 'en'
    };

    // Add optional filters
    if (filters?.campaignFilter) {
      params.campaign_filter = filters.campaignFilter;
    }
    if (filters?.breakdownType) {
      params.breakdown_type = filters.breakdownType;
      params.breakdown_group_by = filters.breakdownGroupBy || 'both';
    }

    // Add account filter
    if (accountId) {
      params.account_id = accountId;
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
  dateRange: DateRange,
  accountId?: string | null,
  locale?: string
): Promise<DeepInsightsResponse | null> {
  try {
    const response = await apiClient.get<DeepInsightsResponse>('/api/v1/insights/deep-analysis', {
      params: {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        account_id: accountId,
        locale: locale || 'en'
      }
    });
    return response.data;
  } catch (error) {
    console.error('[Insights Service] Error fetching deep insights:', error);
    throw error;
  }
}

// ========== AI Agent Insights ==========

export interface HistoricalAnalysisResponse {
  analysis: string; // AI-generated markdown analysis
  data: {
    weekly_trends: Array<{
      week_start: string;
      spend: number;
      conversions: number;
      roas: number;
      wow_change_pct: number;
    }>;
    daily_seasonality: Array<{
      day_of_week: number;
      day_name: string;
      avg_ctr: number;
      avg_roas: number;
      total_conversions: number;
    }>;
    trend_metrics: {
      trend_direction: string;
      trend_strength: number;
      volatility: number;
      best_day: string;
      worst_day: string;
    };
  };
  metadata: {
    lookback_days: number;
    campaign_id?: number;
    generated_at: string;
  };
}

export interface CreativeAnalysisResponse {
  analysis: string; // AI-generated markdown analysis
  data: {
    total_creatives: number;
    theme_performance: Record<string, {
      creative_count: number;
      total_spend: number;
      total_conversions: number;
      overall_roas: number;
      avg_ctr: number;
    }>;
    cta_performance: Array<{
      cta_type: string;
      creative_count: number;
      avg_ctr: number;
      avg_roas: number;
      total_conversions: number;
    }>;
    format_performance: FormatPerformance[];
    fatigued_creatives_count: number;
    fatigued_creatives: Array<{
      creative_id: number;
      ad_name: string;
      title: string;
      initial_ctr: number;
      recent_ctr: number;
      fatigue_pct: number;
    }>;
    top_performers: Array<{
      creative_id: number;
      ad_name: string;
      title: string;
      body: string;
      format_type: 'Image' | 'Video' | 'Carousel';
      ctr: number;
      roas: number;
      hook_rate: number;
      completion_rate: number;
      conversions: number;
    }>;
  };
  metadata: {
    start_date: string;
    end_date: string;
    campaign_id?: number;
    generated_at: string;
  };
}

export interface CampaignAnalysisResponse {
  analysis: string;
  data: {
    total_analyzed: number;
    scale_candidates: Array<any>;
    fix_candidates: Array<any>;
    all_campaigns: Array<any>;
  };
  metadata: {
    start_date: string;
    end_date: string;
    generated_at: string;
  };
}

export interface FormatPerformance {
  format_type: 'Image' | 'Video' | 'Carousel';
  creative_count: number;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  avg_ctr: number;
  avg_hook_rate: number;
  avg_completion_rate: number;
}

export interface CreativeFatigueResponse {
  summary: {
    total_fatigued: number;
    critical_count: number;
    warning_count: number;
    monitor_count: number;
  };
  critical_refreshes: Array<{
    creative_id: number;
    ad_name: string;
    title: string;
    initial_ctr: number;
    recent_ctr: number;
    fatigue_pct: number;
  }>;
  warning_refreshes: Array<{
    creative_id: number;
    ad_name: string;
    title: string;
    initial_ctr: number;
    recent_ctr: number;
    fatigue_pct: number;
  }>;
  monitor_closely: Array<{
    creative_id: number;
    ad_name: string;
    title: string;
    initial_ctr: number;
    recent_ctr: number;
    fatigue_pct: number;
  }>;
  recommendations: string[];
}

/**
 * Fetch historical trend analysis with 90-day lookback
 */
export async function fetchHistoricalAnalysis(
  lookbackDays: number = 90,
  campaignId?: number,
  locale?: string,
  accountId?: string | null
): Promise<HistoricalAnalysisResponse> {
  try {
    const params: any = {
      lookback_days: lookbackDays,
      locale: locale || 'en'
    };
    if (campaignId) {
      params.campaign_id = campaignId;
    }
    if (accountId) {
      params.account_id = accountId;
    }

    const response = await apiClient.get<HistoricalAnalysisResponse>(
      '/api/v1/insights/historical-analysis',
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('[Insights Service] Error fetching historical analysis:', error);
    throw error;
  }
}

/**
 * Fetch creative pattern analysis
 */
export async function fetchCreativeAnalysis(
  dateRange: DateRange,
  campaignId?: number,
  locale?: string,
  accountId?: string | null
): Promise<CreativeAnalysisResponse> {
  try {
    const params: any = {
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
      locale: locale || 'en'
    };
    if (campaignId) {
      params.campaign_id = campaignId;
    }
    if (accountId) {
      params.account_id = accountId;
    }

    const response = await apiClient.get<CreativeAnalysisResponse>(
      '/api/v1/insights/creative-analysis',
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('[Insights Service] Error fetching creative analysis:', error);
    throw error;
  }
}

/**
 * Fetch campaign portfolio analysis
 */
export async function fetchCampaignAnalysis(
  dateRange: DateRange,
  accountId?: string | null,
  locale?: string
): Promise<CampaignAnalysisResponse> {
  try {
    const params: any = {
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
      locale: locale || 'en'
    };
    if (accountId) {
      params.account_id = accountId;
    }

    const response = await apiClient.get<CampaignAnalysisResponse>(
      '/api/v1/insights/campaign-analysis',
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('[Insights Service] Error fetching campaign analysis:', error);
    throw error;
  }
}

/**
 * Fetch creative fatigue report
 */
export async function fetchCreativeFatigue(
  lookbackDays: number = 30,
  locale?: string,
  accountId?: string | null
): Promise<CreativeFatigueResponse> {
  try {
    const params: any = {
      lookback_days: lookbackDays,
      locale: locale || 'en'
    };
    if (accountId) {
      params.account_id = accountId;
    }

    const response = await apiClient.get<CreativeFatigueResponse>(
      '/api/v1/insights/creative-fatigue',
      { params }
    );
    return response.data;
  } catch (error) {
    console.error('[Insights Service] Error fetching creative fatigue:', error);
    throw error;
  }
}
