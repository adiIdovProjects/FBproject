import { apiClient } from './apiClient';

const API_Base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SmartCreative {
    title: string;
    body: string;
    call_to_action: string;
    image_hash?: string;
    video_id?: string;
    link_url?: string;
    lead_form_id?: string;
}

export interface GeoLocationTarget {
    key: string;
    type: 'country' | 'region' | 'city';
    name: string;
    country_code?: string;
}

export interface SmartCampaignRequest {
    account_id: string;
    page_id: string;
    campaign_name: string;
    objective: 'SALES' | 'LEADS' | 'TRAFFIC' | 'ENGAGEMENT';
    geo_locations: GeoLocationTarget[];
    age_min: number;
    age_max: number;
    daily_budget_cents: number;
    pixel_id?: string;  // Required for SALES objective
    creative: SmartCreative;
}

export interface Pixel {
    id: string;
    name: string;
    code?: string;
}

export interface BudgetInfo {
    daily_budget_cents: number | null;
    lifetime_budget_cents: number | null;
    is_cbo?: boolean;  // Only for campaigns
}

export interface GeoLocation {
    key: string;
    name: string;
    type: 'country' | 'region' | 'city';
    country_code?: string;
    country_name?: string;
    region?: string;
    region_id?: string;
    display_name: string;
}

export const mutationsService = {
    async createSmartCampaign(data: SmartCampaignRequest) {
        const response = await apiClient.post('/api/mutations/smart-campaign', data);
        return response.data;
    },

    async getLeadForms(pageId: string, accountId?: string) {
        const response = await apiClient.get('/api/mutations/lead-forms', {
            params: { page_id: pageId, account_id: accountId }
        });
        return response.data;
    },

    async getPixels(accountId: string): Promise<Pixel[]> {
        const response = await apiClient.get('/api/mutations/pixels', {
            params: { account_id: accountId }
        });
        return response.data;
    },

    async searchLocations(query: string, locationTypes: string[] = ['country', 'region', 'city']): Promise<GeoLocation[]> {
        const response = await apiClient.get('/api/mutations/targeting/search', {
            params: { q: query, location_types: locationTypes.join(',') }
        });
        return response.data;
    },

    async getCampaignsList(accountId: string) {
        // accountId usually comes as number from Context but acts as string in API
        const response = await apiClient.get('/api/mutations/campaigns-list', {
            params: { account_id: accountId }
        });
        return response.data;
    },

    async getAdSetsList(campaignId: number | string) {
        const response = await apiClient.get('/api/mutations/adsets-list', {
            params: { campaign_id: campaignId }
        });
        return response.data;
    },

    async addCreativeToAdSet(data: {
        account_id: string;
        page_id: string;
        campaign_id: string;
        adset_id: string;
        creative: SmartCreative;
    }) {
        const response = await apiClient.post('/api/mutations/add-creative', data);
        return response.data;
    },

    async uploadMedia(accountId: string, file: File, isVideo: boolean = false) {
        const formData = new FormData();
        formData.append('account_id', accountId);
        formData.append('is_video', isVideo.toString());
        formData.append('file', file);

        // apiClient should handle Content-Type for FormData automatically (by letting browser set multipart boundary)
        // but sometimes axios needs specific config. Usually simply passing formData works.
        const response = await apiClient.post('/api/mutations/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        return response.data;
    },

    // --- Status & Budget Update Methods ---

    async updateCampaignStatus(campaignId: string, status: 'ACTIVE' | 'PAUSED') {
        const response = await apiClient.patch(`/api/mutations/campaigns/${campaignId}/status`, { status });
        return response.data;
    },

    async updateAdSetStatus(adsetId: string, status: 'ACTIVE' | 'PAUSED') {
        const response = await apiClient.patch(`/api/mutations/adsets/${adsetId}/status`, { status });
        return response.data;
    },

    async updateAdStatus(adId: string, status: 'ACTIVE' | 'PAUSED') {
        const response = await apiClient.patch(`/api/mutations/ads/${adId}/status`, { status });
        return response.data;
    },

    async updateAdSetBudget(adsetId: string, dailyBudgetCents: number) {
        const response = await apiClient.patch(`/api/mutations/adsets/${adsetId}/budget`, {
            daily_budget_cents: dailyBudgetCents
        });
        return response.data;
    },

    async updateCampaignBudget(campaignId: string, dailyBudgetCents: number) {
        const response = await apiClient.patch(`/api/mutations/campaigns/${campaignId}/budget`, {
            daily_budget_cents: dailyBudgetCents
        });
        return response.data;
    },

    // --- Budget Fetch Methods ---

    async getCampaignBudgets(campaignIds: string[]): Promise<Record<string, BudgetInfo>> {
        const response = await apiClient.post('/api/mutations/budgets/campaigns', campaignIds);
        return response.data;
    },

    async getAdSetBudgets(adsetIds: string[]): Promise<Record<string, BudgetInfo>> {
        const response = await apiClient.post('/api/mutations/budgets/adsets', adsetIds);
        return response.data;
    },

    // --- Hierarchy Methods for Manage Page ---

    async getHierarchyCampaigns(accountId: string, startDate: string, endDate: string) {
        const response = await apiClient.get('/api/mutations/hierarchy/campaigns', {
            params: { account_id: accountId, start_date: startDate, end_date: endDate }
        });
        return response.data;
    },

    async getHierarchyAdSets(accountId: string, campaignId: number, startDate: string, endDate: string) {
        const response = await apiClient.get(`/api/mutations/hierarchy/campaigns/${campaignId}/adsets`, {
            params: { account_id: accountId, start_date: startDate, end_date: endDate }
        });
        return response.data;
    },

    async getHierarchyAds(accountId: string, adsetId: number, startDate: string, endDate: string) {
        const response = await apiClient.get(`/api/mutations/hierarchy/adsets/${adsetId}/ads`, {
            params: { account_id: accountId, start_date: startDate, end_date: endDate }
        });
        return response.data;
    }
};
