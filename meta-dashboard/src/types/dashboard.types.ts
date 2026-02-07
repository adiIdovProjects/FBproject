/**
 * Dashboard TypeScript Types
 * Defines all interfaces and types for the Performance Overview Dashboard
 */

import React, { ReactNode } from 'react';

// API Response Types
export interface DailyMetric {
  date: string;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions?: number;
  total_leads?: number;
  total_lead_website?: number;
  total_lead_form?: number;
  conversion_value?: number;
}

export interface ActionMetric {
  date: string;
  action_type: string;
  action_count: number;
  action_value: number;
}

// Calculated Metrics
export interface CalculatedMetrics {
  spend: number;
  ctr: number;  // Click-through rate
  cpc: number;  // Cost per click
  clicks: number;
  actions: number;  // Dynamic Conversions (sum of selected actions)
  cpa: number;  // Cost per action
  roas: number;  // Return on ad spend
  conversion_value: number;  // Total conversion value
  impressions: number;
  cpm: number;  // Cost per mille (1000 impressions)
}

// Metric type for determining trend color logic (avoid string matching translated titles)
export type TrendMetricType = 'spend' | 'efficiency' | 'performance' | 'neutral';

// Metric card color themes
export type MetricColor = 'emerald' | 'blue' | 'amber' | 'purple' | 'orange' | 'rose' | 'indigo';

// Metric Card Props
export interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;  // Percentage change vs previous period
  icon: React.ComponentType<{ className?: string }>;
  format: 'currency' | 'number' | 'decimal' | 'percentage';
  isLoading?: boolean;
  currency?: string;  // Currency code (e.g., "USD", "EUR", "ILS")
  tooltipKey?: string;  // i18n key for metric explanation tooltip
  metricType?: TrendMetricType;  // Type of metric for trend color logic
  color?: MetricColor;  // Color theme for the card
}

// Chart Data Point
export interface ChartDataPoint {
  date: string;
  value: number;
  [key: string]: any;  // Allow additional dynamic properties
}

// Metric Selector Options
export type MetricType = 'actions' | 'spend' | 'clicks' | 'ctr' | 'cpc' | 'cpm' | 'impressions' | 'cpa' | 'roas' | 'conversion_rate';

export interface MetricOption {
  value: MetricType;
  label: string;
  format: 'currency' | 'number' | 'decimal' | 'percentage';
}

// Date Range
export interface DateRange {
  startDate: string;
  endDate: string;
}

// Dashboard State
export interface DashboardState {
  dateRange: DateRange;
  selectedMetric: MetricType;
  isLoading: boolean;
  error: string | null;
}

// API Service Response
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Backend API Response Types (from FastAPI)
export interface BackendMetricsPeriod {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  conversion_value: number;
  lead_website: number;
  lead_form: number;
  roas: number;
  cpa: number;
}

export interface BackendChangePercentage {
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  conversions?: number;
  conversion_value?: number;
  roas?: number;
  cpa?: number;
}

export interface BackendOverviewResponse {
  current_period: BackendMetricsPeriod;
  previous_period?: BackendMetricsPeriod;
  change_percentage?: BackendChangePercentage;
  currency: string;  // Currency code (e.g., "USD", "EUR", "ILS")
}

export interface BackendTimeSeriesPoint {
  date: string;
  spend?: number;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  conversions?: number;
  lead_website?: number;
  lead_form?: number;
  conversion_value?: number;
  roas?: number;
}

// Type Aliases for Service compatibility
export type OverviewMetrics = BackendOverviewResponse;
export type MetricTrend = BackendTimeSeriesPoint;

// Day of Week Breakdown
export interface DayOfWeekBreakdown {
  day_of_week: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number | null;
}

// AI Investigator Types
export interface AIQueryResponse {
  answer: string;
  data?: any[];
  chart_config?: {
    type: string;
    x_axis: string;
    y_axis: string;
  };
  sql_query?: string;
}
