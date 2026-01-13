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
