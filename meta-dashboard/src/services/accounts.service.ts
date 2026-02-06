/**
 * Accounts service - API client for account-level operations
 */

import { apiClient } from './apiClient';

export interface AdAccount {
  account_id: string;
  name: string;
  currency: string;
  page_id?: string;  // Default Facebook Page ID for this account
  page_name?: string;  // Facebook Page name for display
}

export const fetchLinkedAccounts = async (): Promise<AdAccount[]> => {
  const response = await apiClient.get<AdAccount[]>('/api/v1/users/me/accounts');
  return response.data;
};

/**
 * Fetch available Facebook ad accounts for the current user
 */
export const fetchAvailableAccounts = async (): Promise<AdAccount[]> => {
  const response = await apiClient.get<AdAccount[]>('/api/v1/auth/facebook/accounts');
  return response.data;
};

/**
 * Link selected ad accounts to the current user
 * @param accounts - Array of accounts to link
 */
export const linkAccounts = async (accounts: AdAccount[]): Promise<{ message: string; linked_count: number }> => {
  const response = await apiClient.post('/api/v1/auth/facebook/accounts/link', { accounts });
  return response.data;
};

/**
 * Unlink an ad account from the current user
 * @param accountId - The account ID to unlink
 * @param deleteData - Whether to permanently delete the account data
 */
export const unlinkAccount = async (accountId: string, deleteData: boolean = false): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete(`/api/v1/users/me/accounts/${accountId}`, {
    params: { delete_data: deleteData }
  });
  return response.data;
};

export interface ConversionTypesResponse {
  conversion_types: string[];
  is_syncing: boolean;
  has_purchase_value: boolean;
}

export const accountsService = {
  /**
   * Get available conversion types for an account
   */
  getConversionTypes: (accountId: string) =>
    apiClient.get<ConversionTypesResponse>(`/api/v1/accounts/${accountId}/conversion-types`)
};
