/**
 * Creatives Types
 * Defines the data structures for ad creative analysis
 */

import { DateRange } from './dashboard.types';

export interface CreativeMetrics {
    creative_id: number;
    title?: string;
    body?: string;
    is_video: boolean;
    video_length_seconds?: number;
    image_url?: string;
    video_url?: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    video_plays?: number;
    hook_rate: number | null;
    completion_rate: number | null;
    hold_rate: number | null;
    avg_watch_time: number | null;
    conversions: number;
    conversion_value: number;
    roas: number;
    cpa: number;
    // Fatigue detection fields
    fatigue_severity?: string | null;  // "none" | "low" | "medium" | "high"
    ctr_decline_pct?: number | null;
    days_active?: number | null;
}

export interface VideoInsight {
    message: string;
    confidence: number;
    supporting_data?: Record<string, any>;
}

export interface VideoInsightsResponse {
    average_hook_rate: number;
    average_completion_rate: number;
    average_hold_rate: number;
    average_video_time: number;
    best_performing_length: string;
    insights: VideoInsight[];
    top_videos: CreativeMetrics[];
}

export type CreativeSortMetric = 'spend' | 'roas' | 'ctr' | 'hook_rate' | 'conversions';

export interface CreativesFilter {
    dateRange: DateRange;
    is_video?: boolean;
    min_spend?: number;
    sort_by: CreativeSortMetric;
    search_query?: string;
    ad_status?: string;
}

export interface CreativeComparisonMetric {
    metric_name: string;
    values: Record<number, number>;  // creative_id -> value
    winner_id: number | null;
}

export interface CreativeComparisonResponse {
    creative_ids: number[];
    comparisons: CreativeComparisonMetric[];
}
