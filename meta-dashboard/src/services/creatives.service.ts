/**
 * Creatives API Service
 * Handles all API calls for the Creative Insights analysis page
 */

import { apiClient } from './apiClient';
import { CreativeMetrics, VideoInsightsResponse, CreativesFilter, CreativeComparisonResponse } from '../types/creatives.types';
import { DateRange } from '../types/dashboard.types';

/**
 * Fetch performance metrics for all creatives
 */
export async function fetchCreatives(filter: CreativesFilter, accountId?: string | null): Promise<CreativeMetrics[]> {
    const { dateRange, is_video, min_spend, sort_by, search_query, ad_status, campaign_name } = filter;
    const { startDate, endDate } = dateRange;

    const params: any = {
        start_date: startDate,
        end_date: endDate,
        sort_by: sort_by
    };

    if (accountId) {
        params.account_id = accountId;
    }

    if (is_video !== undefined) {
        params.is_video = is_video;
    }

    if (min_spend !== undefined) {
        params.min_spend = min_spend;
    }

    if (search_query) {
        params.search_query = search_query;
    }

    if (ad_status) {
        params.ad_status = ad_status;
    }

    if (campaign_name) {
        params.campaign_name = campaign_name;
    }

    try {
        const response = await apiClient.get<CreativeMetrics[]>('/api/v1/creatives', { params });
        return response.data;
    } catch (error) {
        console.error('[Creatives Service] Error fetching creatives:', error);
        throw error;
    }
}

/**
 * Fetch creatives with period comparison
 */
export async function fetchCreativesWithComparison(filter: CreativesFilter, accountId?: string | null): Promise<CreativeMetrics[]> {
    const { dateRange, is_video, min_spend, sort_by } = filter;
    const { startDate, endDate } = dateRange;

    const params: any = {
        start_date: startDate,
        end_date: endDate,
        sort_by: sort_by
    };

    if (accountId) {
        params.account_id = accountId;
    }

    if (is_video !== undefined) {
        params.is_video = is_video;
    }

    if (min_spend !== undefined) {
        params.min_spend = min_spend;
    }

    try {
        const response = await apiClient.get<CreativeMetrics[]>('/api/v1/metrics/creatives/comparison', { params });
        return response.data;
    } catch (error) {
        console.error('[Creatives Service] Error fetching creatives with comparison:', error);
        throw error;
    }
}

/**
 * Fetch video insights and patterns
 */
export async function fetchVideoInsights(dateRange: DateRange, accountId?: string | null): Promise<VideoInsightsResponse> {
    const { startDate, endDate } = dateRange;

    try {
        const response = await apiClient.get<VideoInsightsResponse>('/api/v1/creatives/insights/video', {
            params: {
                start_date: startDate,
                end_date: endDate,
                account_id: accountId
            }
        });
        return response.data;
    } catch (error) {
        console.error('[Creatives Service] Error fetching video insights:', error);
        throw error;
    }
}

/**
 * Fetch detailed metrics for a single creative
 */
export async function fetchCreativeDetail(creativeId: number, dateRange: DateRange, accountId?: string | null): Promise<any> {
    const { startDate, endDate } = dateRange;

    try {
        const response = await apiClient.get<any>(`/api/v1/creatives/${creativeId}`, {
            params: {
                start_date: startDate,
                end_date: endDate,
                account_id: accountId
            }
        });
        return response.data;
    } catch (error) {
        console.error(`[Creatives Service] Error fetching creative ${creativeId} detail:`, error);
        throw error;
    }
}

/**
 * Compare multiple creatives side-by-side
 */
export async function fetchCreativeComparison(
    creativeIds: number[],
    dateRange: DateRange,
    accountId?: string | null
): Promise<CreativeComparisonResponse> {
    const { startDate, endDate } = dateRange;

    try {
        const response = await apiClient.post<CreativeComparisonResponse>('/api/v1/creatives/compare', {
            creative_ids: creativeIds,
            start_date: startDate,
            end_date: endDate,
            metrics: ['spend', 'roas', 'ctr', 'cpc', 'conversions', 'cpa', 'hook_rate', 'completion_rate']
        }, {
            params: {
                account_id: accountId
            }
        });
        return response.data;
    } catch (error) {
        console.error('[Creatives Service] Error comparing creatives:', error);
        throw error;
    }
}
