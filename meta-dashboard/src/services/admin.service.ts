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

// ==================== User Management Types ====================

export interface UserSearchResult {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string | null;
  subscription_status: string;
  plan_type: string;
  onboarding_completed: boolean;
}

export interface UserSubscription {
  status: string;
  plan_type: string;
  trial_start: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
}

export interface LinkedAccount {
  account_id: string;
  account_name: string;
  permission_level: string;
}

export interface UserDetail {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Profile
  job_title: string | null;
  years_experience: string | null;
  referral_source: string | null;
  // Auth
  email_verified: boolean;
  fb_connected: boolean;
  google_connected: boolean;
  is_admin: boolean;
  // Onboarding
  onboarding_completed: boolean;
  onboarding_step: string | null;
  // Subscription
  subscription: UserSubscription;
  // Accounts
  linked_accounts: LinkedAccount[];
  account_count: number;
}

export interface UserActivityEvent {
  id: number;
  event_type: string;
  description: string | null;
  metadata: string | null;
  created_at: string | null;
}

export interface UserPageView {
  id: number;
  page_path: string;
  page_title: string | null;
  created_at: string | null;
}

export interface SubscriptionHistoryEvent {
  id: number;
  event_type: string;
  from_plan: string | null;
  to_plan: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface UsersListResponse {
  users: UserSearchResult[];
  total: number;
  limit: number;
  offset: number;
}

export interface SubscriptionStats {
  by_status: Record<string, number>;
  by_plan: Record<string, number>;
  trials_ending_soon: number;
}

// ==================== User Management Functions ====================

/**
 * Search users by email, name, or ID
 */
export async function searchUsers(query: string, limit: number = 50): Promise<UserSearchResult[]> {
  const response = await apiClient.get<UserSearchResult[]>('/api/v1/admin/users/search', {
    params: { q: query, limit },
  });
  return response.data;
}

/**
 * Get paginated list of all users
 */
export async function fetchUsersList(limit: number = 100, offset: number = 0): Promise<UsersListResponse> {
  const response = await apiClient.get<UsersListResponse>('/api/v1/admin/users/list', {
    params: { limit, offset },
  });
  return response.data;
}

/**
 * Get comprehensive user detail
 */
export async function fetchUserDetail(userId: number): Promise<UserDetail> {
  const response = await apiClient.get<UserDetail>(`/api/v1/admin/users/${userId}`);
  return response.data;
}

/**
 * Get user activity timeline
 */
export async function fetchUserActivity(userId: number, limit: number = 100): Promise<UserActivityEvent[]> {
  const response = await apiClient.get<UserActivityEvent[]>(`/api/v1/admin/users/${userId}/activity`, {
    params: { limit },
  });
  return response.data;
}

/**
 * Get user page view history
 */
export async function fetchUserPageViews(userId: number, limit: number = 100): Promise<UserPageView[]> {
  const response = await apiClient.get<UserPageView[]>(`/api/v1/admin/users/${userId}/page-views`, {
    params: { limit },
  });
  return response.data;
}

/**
 * Get user subscription history
 */
export async function fetchUserSubscriptionHistory(userId: number): Promise<SubscriptionHistoryEvent[]> {
  const response = await apiClient.get<SubscriptionHistoryEvent[]>(`/api/v1/admin/users/${userId}/subscription-history`);
  return response.data;
}

/**
 * Get subscription metrics
 */
export async function fetchSubscriptionStats(): Promise<SubscriptionStats> {
  const response = await apiClient.get<SubscriptionStats>('/api/v1/admin/subscriptions');
  return response.data;
}

// ==================== Revenue Metrics ====================

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  churn_rate: number;
  trial_to_paid_rate: number;
  paying_customers: number;
  subscription_stats: SubscriptionStats;
  status: string;
}

/**
 * Get revenue and subscription metrics
 */
export async function fetchRevenueMetrics(days: number = 30): Promise<RevenueMetrics> {
  const response = await apiClient.get<RevenueMetrics>('/api/v1/admin/revenue', {
    params: { days },
  });
  return response.data;
}

// ==================== Account Health ====================

export interface AccountHealth {
  total_accounts: number;
  active_accounts: number;
  stale_accounts: number;
  no_data_accounts: number;
  total_spend_30d: number;
  last_syncs: Array<{
    account_id: string;
    account_name: string;
    last_data_date: string | null;
  }>;
}

/**
 * Get account health overview
 */
export async function fetchAccountHealth(): Promise<AccountHealth> {
  const response = await apiClient.get<AccountHealth>('/api/v1/admin/accounts/health');
  return response.data;
}

// ==================== Feature Adoption ====================

export interface FeatureUsage {
  feature: string;
  unique_users: number;
  total_views: number;
  adoption_rate: number;
}

export interface FeatureAdoption {
  features: FeatureUsage[];
  total_active_users: number;
}

/**
 * Get feature adoption metrics
 */
export async function fetchFeatureAdoption(days: number = 30): Promise<FeatureAdoption> {
  const response = await apiClient.get<FeatureAdoption>('/api/v1/admin/features', {
    params: { days },
  });
  return response.data;
}

// ==================== Error Trends ====================

export interface ErrorSummary {
  error_type: string;
  count: number;
  affected_users: number;
}

export interface ErrorTrends {
  trends: Array<Record<string, unknown>>;
  summary: ErrorSummary[];
}

/**
 * Get error trends
 */
export async function fetchErrorTrends(days: number = 30): Promise<ErrorTrends> {
  const response = await apiClient.get<ErrorTrends>('/api/v1/admin/errors/trends', {
    params: { days },
  });
  return response.data;
}
