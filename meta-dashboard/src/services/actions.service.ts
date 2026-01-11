/**
 * Actions API Service
 * Handles fetching and toggling conversion action types
 */

import { apiClient } from './apiClient';

export interface ActionType {
    action_type: string;
    is_conversion: boolean;
}

/**
 * Fetch all action types and their conversion status
 */
export async function fetchActionTypes(): Promise<ActionType[]> {
    try {
        const response = await apiClient.get<ActionType[]>('/api/v1/actions/types');
        return response.data;
    } catch (error) {
        console.error('[Actions Service] Error fetching action types:', error);
        throw error;
    }
}

/**
 * Toggle the is_conversion status for an action type
 */
export async function toggleActionConversion(actionType: string, isConversion: boolean): Promise<{ success: boolean }> {
    try {
        const response = await apiClient.post<{ success: boolean }>('/api/v1/actions/types/toggle', {
            action_type: actionType,
            is_conversion: isConversion
        });
        return response.data;
    } catch (error) {
        console.error('[Actions Service] Error toggling action conversion:', error);
        throw error;
    }
}

export interface FunnelStep {
    step_order: number;
    action_type: string;
}

export async function fetchFunnel(): Promise<FunnelStep[]> {
    try {
        const response = await apiClient.get<FunnelStep[]>('/api/v1/actions/funnel');
        return response.data;
    } catch (error) {
        console.error('[Actions Service] Error fetching funnel:', error);
        return [];
    }
}

export async function saveFunnel(steps: FunnelStep[]): Promise<{ status: string }> {
    try {
        const response = await apiClient.post<{ status: string }>('/api/v1/actions/funnel', { steps });
        return response.data;
    } catch (error) {
        console.error('[Actions Service] Error saving funnel:', error);
        throw error;
    }
}
