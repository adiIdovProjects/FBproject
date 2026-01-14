/**
 * Activity Tracking API Service
 * Handles page view and feature tracking
 */

import { apiClient } from './apiClient';

/**
 * Track a page view
 */
export async function trackPageView(
  pagePath: string,
  pageTitle?: string,
  referrer?: string,
  sessionId?: string
): Promise<void> {
  try {
    await apiClient.post('/api/v1/activity/page-view', {
      page_path: pagePath,
      page_title: pageTitle,
      referrer: referrer,
      session_id: sessionId,
    });
  } catch (error) {
    // Silently fail - don't disrupt user experience for tracking
    console.debug('Failed to track page view:', error);
  }
}

/**
 * Track feature usage
 */
export async function trackFeature(
  featureName: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await apiClient.post('/api/v1/activity/feature', {
      feature_name: featureName,
      metadata: metadata,
    });
  } catch (error) {
    // Silently fail
    console.debug('Failed to track feature:', error);
  }
}
