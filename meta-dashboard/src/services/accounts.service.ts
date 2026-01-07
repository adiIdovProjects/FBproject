/**
 * Accounts API Service
 * Handles Facebook ad account management and linking
 */

import { apiClient } from './apiClient';

/**
 * Interface for Facebook Ad Account
 */
export interface AdAccount {
    account_id: string;
    name: string;
    currency: string;
}

/**
 * Interface for account linking request
 */
export interface LinkAccountsRequest {
    accounts: {
        account_id: string;
        name: string;
        currency: string;
    }[];
}

/**
 * Interface for account linking response
 */
export interface LinkAccountsResponse {
    message: string;
    linked_count: number;
    sync_status?: 'in_progress' | 'completed' | 'failed';
    estimated_time_seconds?: number;
}

/**
 * Fetch available Facebook ad accounts for current user
 * GET /api/v1/auth/facebook/accounts
 */
export async function fetchAvailableAccounts(): Promise<AdAccount[]> {
    try {
        const response = await apiClient.get<AdAccount[]>('/api/v1/auth/facebook/accounts');
        return response.data;
    } catch (error) {
        console.error('[Accounts Service] Error fetching available accounts:', error);
        throw error;
    }
}

/**
 * Link selected ad accounts to current user
 * POST /api/v1/auth/facebook/accounts/link
 */
export async function linkAccounts(accounts: AdAccount[]): Promise<LinkAccountsResponse> {
    try {
        const requestData: LinkAccountsRequest = {
            accounts: accounts.map(acc => ({
                account_id: acc.account_id,
                name: acc.name,
                currency: acc.currency
            }))
        };

        const response = await apiClient.post<LinkAccountsResponse>(
            '/api/v1/auth/facebook/accounts/link',
            requestData
        );

        return response.data;
    } catch (error) {
        console.error('[Accounts Service] Error linking accounts:', error);
        throw error;
    }
}

export async function fetchLinkedAccounts(): Promise<AdAccount[]> {
    try {
        const response = await apiClient.get<AdAccount[]>('/api/v1/users/me/accounts');
        return response.data;
    } catch (error) {
        console.error('[Accounts Service] Error fetching linked accounts:', error);
        throw error;
    }
}

/**
 * Unlink an ad account from the current user
 * DELETE /api/v1/users/me/accounts/{account_id}
 */
export async function unlinkAccount(accountId: string, deleteData: boolean = false): Promise<void> {
    try {
        await apiClient.delete(`/api/v1/users/me/accounts/${accountId}?delete_data=${deleteData}`);
    } catch (error) {
        console.error('[Accounts Service] Error unlinking account:', error);
        throw error;
    }
}
