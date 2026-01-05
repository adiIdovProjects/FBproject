/**
 * Campaign Performance Analysis - Type Definitions
 */

// Campaign row with metrics and period comparison
export interface CampaignRow {
  campaign_id: number;
  campaign_name: string;
  campaign_status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  conversion_value: number;
  roas: number;
  cpa: number;

  // Lead metrics
  lead_website?: number;
  lead_form?: number;

  // Comparison to previous period
  previous_spend?: number;
  previous_conversions?: number;
  previous_conversion_value?: number;
  previous_roas?: number;
  previous_cpa?: number;
  spend_change_pct?: number;
  conversions_change_pct?: number;
  roas_change_pct?: number;
  cpa_change_pct?: number;
}

// Breakdown data (placement, demographics, country)
export interface BreakdownRow {
  name: string;
  spend: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  conversions: number;
  conversion_value: number;
  roas: number;
  cpa: number;
  lead_website?: number;
  lead_form?: number;
  adset_id?: number;
  targeting_type?: string;
  targeting_summary?: string;
}

// Time granularity options
export type TimeGranularity = 'day' | 'week' | 'month';

// Breakdown type options
export type BreakdownType = 'placement' | 'age-gender' | 'country' | 'platform' | 'adset';

// Aggregated campaign metrics for KPI cards
export interface CampaignMetrics {
  totalSpend: number;
  avgRoas: number;
  totalConversions: number;
  avgCpa: number;

  // Previous period
  previousTotalSpend?: number;
  previousAvgRoas?: number;
  previousTotalConversions?: number;
  previousAvgCpa?: number;

  // Trends
  spendTrend?: number;
  roasTrend?: number;
  conversionsTrend?: number;
  cpaTrend?: number;
}

// Sort configuration
export interface SortConfig {
  key: keyof CampaignRow;
  direction: 'asc' | 'desc';
}

// Date range for API requests
export interface DateRange {
  startDate: string;
  endDate: string;
}
