/**
 * Business Profile Service
 * Fetches business profile data for personalization
 */

import { apiClient } from './apiClient';

export interface BusinessProfile {
  business_type?: 'ecommerce' | 'lead_gen' | 'saas' | 'local_business' | 'agency' | 'media' | 'nonprofit' | 'other';
  industry?: string;
  target_audience?: string;
  tone_of_voice?: string;
  products_services?: string[];
  business_description?: string;
  website_url?: string;
}

export interface BusinessProfileResponse {
  has_profile: boolean;
  data: BusinessProfile | null;
}

class BusinessProfileService {
  /**
   * Fetch business profile for an account
   */
  async getBusinessProfile(accountId: string): Promise<BusinessProfile | null> {
    try {
      const response = await apiClient.get<BusinessProfileResponse>(
        `/api/v1/accounts/${accountId}/business-profile`
      );

      if (response.data.has_profile && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.warn('Failed to fetch business profile:', error);
      return null; // Gracefully return null if profile doesn't exist
    }
  }
}

export const businessProfileService = new BusinessProfileService();
