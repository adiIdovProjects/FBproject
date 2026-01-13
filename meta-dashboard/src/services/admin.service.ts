/**
 * Admin API Service
 * Handles all API calls for the Admin Analytics Dashboard
 */

import { apiClient } from './apiClient';

// Types
export interface SignupDataPoint {
  date: string;
  count: number;
}

export interface AccountsPerUserDistribution {
  [key: string]: number;
}

export interface AuthMethodBreakdown {
  method: string;
  count: number;
}

export interface FunnelMetrics {
  signups: number;
  facebook_connected: number;
  accounts_linked: number;
  onboarding_completed: number;
  facebook_rate?: number;
  accounts_rate?: number;
  completion_rate?: number;
}

export interface UserMetrics {
  total_users: number;
  signups_over_time: SignupDataPoint[];
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
  onboarding_completion_rate: number;
}

export interface AccountMetrics {
  total_ad_accounts: number;
  unique_ad_accounts: number;
  accounts_per_user: AccountsPerUserDistribution;
}

export interface AdminDashboardResponse {
  user_metrics: UserMetrics;
  account_metrics: AccountMetrics;
  funnel_metrics: FunnelMetrics;
  auth_breakdown: AuthMethodBreakdown[];
}

export interface ErrorLogEntry {
  id: number;
  user_id: string;
  event_type: string;
  description: string | null;
  metadata: string | null;
  created_at: string | null;
}

export interface ActivityLogEntry {
  id: number;
  user_id: string;
  event_type: string;
  description: string | null;
  created_at: string | null;
}

export interface ReferralSourceData {
  source: string;
  count: number;
}

export interface JobTitleData {
  job_title: string;
  count: number;
}

export interface DetailedUserMetrics {
  total: number;
  signups: SignupDataPoint[];
  dau: number;
  wau: number;
  mau: number;
  onboarding_rate: number;
  by_referral_source: ReferralSourceData[];
  by_job_title: JobTitleData[];
}

/**
 * Fetch aggregated admin dashboard metrics
 */
export async function fetchAdminDashboard(days: number = 30): Promise<AdminDashboardResponse> {
  const response = await apiClient.get<AdminDashboardResponse>('/api/v1/admin/dashboard', {
    params: { days },
  });
  return response.data;
}

/**
 * Fetch detailed user metrics
 */
export async function fetchUserMetrics(days: number = 30): Promise<DetailedUserMetrics> {
  const response = await apiClient.get<DetailedUserMetrics>('/api/v1/admin/users', {
    params: { days },
  });
  return response.data;
}

/**
 * Fetch funnel metrics with conversion rates
 */
export async function fetchFunnelMetrics(days: number = 30): Promise<FunnelMetrics> {
  const response = await apiClient.get<FunnelMetrics>('/api/v1/admin/funnel', {
    params: { days },
  });
  return response.data;
}

/**
 * Fetch error logs
 */
export async function fetchErrorLogs(limit: number = 100): Promise<ErrorLogEntry[]> {
  const response = await apiClient.get<ErrorLogEntry[]>('/api/v1/admin/errors', {
    params: { limit },
  });
  return response.data;
}

/**
 * Fetch recent activity logs
 */
export async function fetchActivityLogs(limit: number = 50): Promise<ActivityLogEntry[]> {
  const response = await apiClient.get<ActivityLogEntry[]>('/api/v1/admin/activity', {
    params: { limit },
  });
  return response.data;
}

/**
 * Fetch revenue placeholder (for future Stripe integration)
 */
export async function fetchRevenue(): Promise<{
  message: string;
  mrr: number;
  total_revenue: number;
  paying_customers: number;
  status: string;
}> {
  const response = await apiClient.get('/api/v1/admin/revenue');
  return response.data;
}
