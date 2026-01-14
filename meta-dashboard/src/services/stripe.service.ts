/**
 * Stripe API Service
 * Handles subscription management
 */

import { apiClient } from './apiClient';

export interface SubscriptionStatus {
  status: string;
  plan_type: string;
  trial_end: string | null;
  current_period_end: string | null;
}

export interface CheckoutSession {
  url: string;
  session_id: string;
}

export interface BillingPortal {
  url: string;
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await apiClient.get<SubscriptionStatus>('/api/v1/stripe/subscription');
  return response.data;
}

/**
 * Create checkout session for new subscription
 */
export async function createCheckoutSession(planType: string): Promise<CheckoutSession> {
  const response = await apiClient.post<CheckoutSession>(
    `/api/v1/stripe/create-checkout-session?plan_type=${planType}`
  );
  return response.data;
}

/**
 * Get billing portal URL for managing subscription
 */
export async function getBillingPortalUrl(): Promise<BillingPortal> {
  const response = await apiClient.get<BillingPortal>('/api/v1/stripe/billing-portal');
  return response.data;
}
