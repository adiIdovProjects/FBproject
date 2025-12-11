// src/types.ts

// Data format returned from the API for daily or detailed reports (core_summary)
export interface DailyKpi {
  date: string; // ISO format (YYYY-MM-DD)
  spend: number;
  purchases: number;
  // Any additional fields returned (e.g., clicks, impressions)
}

// Aggregated data format (calculated in the Frontend or Backend summary)
export interface KpiSummary {
  total_spend: number;
  total_purchases: number;
  cpa: number;
}

// Data format returned for the Creative Breakdown Report
export interface CreativeMetric {
    creative_name: string;
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_purchases: number;
    CTR: number;
    CPC: number;
    CPA: number;
}