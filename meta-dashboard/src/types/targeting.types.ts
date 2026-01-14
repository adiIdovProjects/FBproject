/**
 * Targeting Analysis Types
 * Types for adset-level targeting performance data
 */

export interface TargetingRow {
  adset_id: number;
  adset_name: string;
  targeting_type: string;        // "Broad" | "Lookalike" | "Interest" | "Custom Audience"
  targeting_summary: string;     // Human-readable targeting description
  spend: number;
  clicks: number;
  impressions: number;
  ctr: number;                   // Calculated: clicks/impressions * 100
  cpc: number;                   // Calculated: spend/clicks
  conversions: number;
  conversion_value: number;
  purchases: number;
  purchase_value: number;
  roas: number;                  // Calculated: purchase_value/spend
  cpa: number;                   // Calculated: spend/conversions
  // Comparison fields (optional, only present when comparing periods)
  previous_spend?: number | null;
  previous_clicks?: number | null;
  previous_impressions?: number | null;
  previous_conversions?: number | null;
  previous_ctr?: number | null;
  previous_cpc?: number | null;
  previous_cpa?: number | null;
  spend_change_pct?: number | null;
  clicks_change_pct?: number | null;
  conversions_change_pct?: number | null;
  ctr_change_pct?: number | null;
  cpc_change_pct?: number | null;
  cpa_change_pct?: number | null;
}

export type TargetingSortMetric =
  | 'adset_name'
  | 'targeting_type'
  | 'spend'
  | 'clicks'
  | 'impressions'
  | 'ctr'
  | 'cpc'
  | 'conversions'
  | 'roas'
  | 'cpa';

export interface TargetingTypeMetrics {
  avgROAS: number;
  avgCTR: number;
  totalSpend: number;
  count: number;
}
