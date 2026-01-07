/**
 * Dashboard API Service
 * Handles all API calls for the Performance Overview Dashboard
 */

import { apiClient } from './apiClient';
import {
  CalculatedMetrics,
  DateRange,
  OverviewMetrics,
  MetricTrend,
} from '../types/dashboard.types';

/**
 * Fetch overview metrics from the backend (KPIs with trends)
 */
export async function fetchOverviewMetrics(
  period: string,
  previous_period?: string,
  accountId?: string | null
): Promise<OverviewMetrics> {
  try {
    const [startDate, endDate] = period.split(':');
    const params: any = {
      start_date: startDate,
      end_date: endDate
    };
    if (previous_period) params.compare_to_previous = true; // Backend expects boolean, not string
    if (accountId) params.account_id = accountId;

    const response = await apiClient.get<OverviewMetrics>('/api/v1/metrics/overview', {
      params
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching overview metrics:', error);
    throw error;
  }
}

/**
 * Fetch time series data from the backend (for charts)
 */
export async function fetchMetricTrends(
  period: string,
  time_grain: 'day' | 'week' | 'month' = 'day',
  accountId?: string | null
): Promise<MetricTrend[]> {
  try {
    const [startDate, endDate] = period.split(':');
    const params: any = {
      start_date: startDate,
      end_date: endDate,
      time_grain: time_grain
    };
    if (accountId) {
      params.account_id = accountId;
    }

    const response = await apiClient.get<MetricTrend[]>('/api/v1/metrics/trend', {
      params
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching metric trends:', error);
    throw error;
  }
}

/**
 * Fetch metrics with trends for the dashboard
 */
export async function fetchMetricsWithTrends(dateRange: DateRange, accountId?: string | null) {
  try {
    const period = `${dateRange.startDate}:${dateRange.endDate}`;

    // Fetch overview data (includes trends already calculated by backend)
    // Pass 'auto' to enable backend comparison with previous period
    const overviewData = await fetchOverviewMetrics(period, 'auto', accountId);

    // Fetch daily time series data for charts
    const trendData = await fetchMetricTrends(period, 'day', accountId);

    // Map backend data to frontend format
    const current: CalculatedMetrics = {
      spend: overviewData.current_period.spend,
      ctr: overviewData.current_period.ctr,
      cpc: overviewData.current_period.cpc,
      clicks: overviewData.current_period.clicks,
      actions: overviewData.current_period.conversions,
      cpa: overviewData.current_period.cpa,
      roas: overviewData.current_period.roas,
      conversion_value: overviewData.current_period.conversion_value,
      impressions: overviewData.current_period.impressions,
      cpm: overviewData.current_period.cpm,
    };

    const previous: CalculatedMetrics | null = overviewData.previous_period
      ? {
        spend: overviewData.previous_period.spend,
        ctr: overviewData.previous_period.ctr,
        cpc: overviewData.previous_period.cpc,
        clicks: overviewData.previous_period.clicks,
        actions: overviewData.previous_period.conversions,
        cpa: overviewData.previous_period.cpa,
        roas: overviewData.previous_period.roas,
        conversion_value: overviewData.previous_period.conversion_value,
        impressions: overviewData.previous_period.impressions,
        cpm: overviewData.previous_period.cpm,
      }
      : null;

    const trends = overviewData.change_percentage
      ? {
        spend: overviewData.change_percentage.spend || 0,
        ctr: overviewData.change_percentage.ctr || 0,
        cpc: overviewData.change_percentage.cpc || 0,
        clicks: overviewData.change_percentage.clicks || 0,
        actions: overviewData.change_percentage.conversions || 0,
        cpa: overviewData.change_percentage.cpa || 0,
        roas: overviewData.change_percentage.roas || 0,
        impressions: overviewData.change_percentage.impressions || 0,
        cpm: overviewData.change_percentage.cpm || 0,
      }
      : {
        spend: 0,
        ctr: 0,
        cpc: 0,
        clicks: 0,
        actions: 0,
        cpa: 0,
        roas: 0,
        impressions: 0,
        cpm: 0,
      };

    // Map daily data for charts
    const dailyData = trendData.map((point) => ({
      date: point.date,
      total_spend: point.spend || 0,
      total_impressions: point.impressions || 0,
      total_clicks: point.clicks || 0,
      total_conversions: point.conversions || 0,
      total_lead_website: point.lead_website || 0,
      total_lead_form: point.lead_form || 0,
      total_leads: (point.lead_website || 0) + (point.lead_form || 0),
      conversion_value: point.conversion_value || 0,
    }));

    return {
      current,
      previous,
      trends,
      dailyData,
      currency: overviewData.currency || 'USD',
    };
  } catch (error) {
    console.error('[Dashboard Service] Error fetching metrics with trends:', error);
    throw error;
  }
}
