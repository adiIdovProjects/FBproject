/**
 * Creatives API Service
 * Handles all API calls for the Creative Insights analysis page
 */

import { CreativeMetrics, VideoInsightsResponse, CreativesFilter } from '../types/creatives.types';
import { DateRange } from '../types/dashboard.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Fetch performance metrics for all creatives
 */
export async function fetchCreatives(filter: CreativesFilter): Promise<CreativeMetrics[]> {
    const { dateRange, is_video, min_spend, sort_by } = filter;
    const { startDate, endDate } = dateRange;

    let url = `${API_BASE_URL}/api/v1/creatives?start_date=${startDate}&end_date=${endDate}&sort_by=${sort_by}`;

    if (is_video !== undefined) {
        url += `&is_video=${is_video}`;
    }

    if (min_spend !== undefined) {
        url += `&min_spend=${min_spend}`;
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
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
    const url = `${API_BASE_URL}/api/v1/creatives/insights/video?start_date=${startDate}&end_date=${endDate}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
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
    const url = `${API_BASE_URL}/api/v1/creatives/${creativeId}?start_date=${startDate}&end_date=${endDate}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`[Creatives Service] Error fetching creative ${creativeId} detail:`, error);
        throw error;
    }
}
