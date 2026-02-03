/**
 * Pixel service - API client for pixel event scanning and optimization summaries
 */

import { apiClient } from './apiClient';

export interface PixelInfo {
  id: string;
  name: string;
  is_unavailable: boolean;
  last_fired_time: string | null;
  health: 'healthy' | 'active' | 'stale' | 'never_fired' | 'unknown';
  events?: PixelEvent[];
}

export interface PixelEvent {
  event_name: string;
  count: number;
}

export interface LeadFormSummary {
  id: string;
  name: string;
  status: string;
  leads_count: number;
}

export interface SmartWarning {
  type: string;
  business_type?: string;
  missing_events?: string[];
  message: string;
}

export interface OptimizationSummary {
  pixels: PixelInfo[];
  events: PixelEvent[];
  active_objectives: string[];
  lead_forms: LeadFormSummary[];
  has_pixel: boolean;
  has_active_events: boolean;
  has_lead_forms: boolean;
  warnings: SmartWarning[];
}

export const fetchAccountPixels = async (accountId: string) => {
  const response = await apiClient.get<{ pixels: PixelInfo[]; count: number }>(
    `/api/v1/pixels/${accountId}`
  );
  return response.data;
};

export const fetchOptimizationSummary = async (
  accountId: string,
  pageId?: string
): Promise<OptimizationSummary> => {
  const params = pageId ? { page_id: pageId } : {};
  const response = await apiClient.get<OptimizationSummary>(
    `/api/v1/pixels/${accountId}/events`,
    { params }
  );
  return response.data;
};

export const fetchPixelStats = async (pixelId: string, days: number = 30) => {
  const response = await apiClient.get<{ pixel_id: string; days: number; events: PixelEvent[] }>(
    `/api/v1/pixels/stats/${pixelId}`,
    { params: { days } }
  );
  return response.data;
};
