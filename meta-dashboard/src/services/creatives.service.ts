/**
 * Creatives API Service
 * Handles all API calls for the Creative Insights analysis page
 */

import { apiClient } from './apiClient';
import { CreativeMetrics, VideoInsightsResponse, CreativesFilter } from '../types/creatives.types';
import { DateRange } from '../types/dashboard.types';

/**
 * Fetch performance metrics for all creatives
 */
export async function fetchCreatives(filter: CreativesFilter): Promise<CreativeMetrics[]> {
    const { dateRange, is_video, min_spend, sort_by } = filter;
    const { startDate, endDate } = dateRange;

    const params: any = {
        start_date: startDate,
        end_date: endDate,
        sort_by: sort_by
    };

    if (is_video !== undefined) {
        params.is_video = is_video;
    }

    if (min_spend !== undefined) {
        params.min_spend = min_spend;
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
 * Fetch video insights and patterns
 */
export async function fetchVideoInsights(dateRange: DateRange): Promise<VideoInsightsResponse> {
    const { startDate, endDate } = dateRange;

    try {
        const response = await apiClient.get<VideoInsightsResponse>('/api/v1/creatives/insights/video', {
            params: {
                start_date: startDate,
                end_date: endDate
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
export async function fetchCreativeDetail(creativeId: number, dateRange: DateRange): Promise<any> {
    const { startDate, endDate } = dateRange;

    try {
        const response = await apiClient.get<any>(`/api/v1/creatives/${creativeId}`, {
            params: {
                start_date: startDate,
                end_date: endDate
            }
        });
        return response.data;
    } catch (error) {
        console.error(`[Creatives Service] Error fetching creative ${creativeId} detail:`, error);
        throw error;
    }
}
