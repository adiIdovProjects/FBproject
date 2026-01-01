/**
 * AI Investigator API Service
 * Handles communication with the AI Investigator backend
 */

import { apiClient } from './apiClient';
import { AIQueryResponse } from '../types/dashboard.types';

/**
 * Send a natural language query to the AI Investigator
 */
export async function queryAIInvestigator(question: string): Promise<AIQueryResponse> {
    try {
        const response = await apiClient.post<AIQueryResponse>('/api/v1/ai/query', {
            question
        });
        return response.data;
    } catch (error) {
        console.error('[AI Service] Error querying AI Investigator:', error);
        throw error;
    }
}
