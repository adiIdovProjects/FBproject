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

export interface InterestTarget {
    id: string;
    name: string;
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
    custom_audiences?: string[];  // Optional custom audience IDs (lookalikes, saved audiences)
    excluded_audiences?: string[];  // Optional custom audience IDs to exclude
    interests?: InterestTarget[];  // Optional interest targeting
    pixel_id?: string;  // Required for SALES objective
    creative: SmartCreative;
    adset_name?: string;  // Optional custom ad set name
    ad_name?: string;     // Optional custom ad name
}

export interface AddCreativeRequest {
    account_id: string;
    page_id: string;
    campaign_id: string;
    adset_id: string;
    creative: SmartCreative;
    ad_name?: string;  // Optional custom ad name
}

export interface UpdateAdSetTargetingRequest {
    geo_locations?: GeoLocationTarget[];
    age_min?: number;
    age_max?: number;
    daily_budget_cents?: number;
}

export interface UpdateAdCreativeRequest {
    account_id: string;
    page_id: string;
    title?: string;
    body?: string;
    call_to_action?: string;
    image_hash?: string;
    video_id?: string;
    link_url?: string;
    lead_form_id?: string;
}

export interface Pixel {
    id: string;
    name: string;
    code?: string;
}

export interface CustomAudience {
    id: string;
    name: string;
    subtype: string;  // LOOKALIKE, CUSTOM, etc.
    approximate_count?: number;
    type_label: string;
}

export interface Interest {
    id: string;
    name: string;
    audience_size_lower_bound: number;
    audience_size_upper_bound: number;
    path: string[];
    topic: string;
}

export interface BudgetInfo {
    daily_budget_cents: number | null;
    lifetime_budget_cents: number | null;
    is_cbo?: boolean;  // Only for campaigns
}

export interface GeoLocation {
    key: string;
    name: string;
    type: 'country' | 'region' | 'city' | 'custom_location';
    country_code?: string;
    country_name?: string;
    region?: string;
    region_id?: string;
    display_name: string;
}

export interface AdSetTargeting {
    locations: GeoLocation[];
    age_min: number;
    age_max: number;
}

export interface AdCreativeData {
    title: string;
    body: string;
    link_url: string;
    call_to_action: string;
    lead_form_id: string;
    image_url: string | null;
    video_url: string | null;
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

    async getCustomAudiences(accountId: string): Promise<CustomAudience[]> {
        const response = await apiClient.get('/api/mutations/custom-audiences', {
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

    async searchInterests(query: string): Promise<Interest[]> {
        const response = await apiClient.get('/api/mutations/targeting/interests', {
            params: { q: query }
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

    async addCreativeToAdSet(data: AddCreativeRequest) {
        const response = await apiClient.post('/api/mutations/add-creative', data);
        return response.data;
    },

    async getAdsList(adsetId: number | string) {
        const response = await apiClient.get('/api/mutations/ads-list', {
            params: { adset_id: adsetId }
        });
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
    },

    // --- Edit Methods ---

    async updateAdSetTargeting(adsetId: string, data: UpdateAdSetTargetingRequest) {
        const response = await apiClient.patch(`/api/mutations/adsets/${adsetId}/targeting`, data);
        return response.data;
    },

    async updateAdCreative(adId: string, data: UpdateAdCreativeRequest) {
        const response = await apiClient.patch(`/api/mutations/ads/${adId}/creative`, data);
        return response.data;
    },

    // --- Fetch Current Data Methods ---

    async getAdSetTargeting(adsetId: string): Promise<AdSetTargeting> {
        const response = await apiClient.get(`/api/mutations/adsets/${adsetId}/targeting`);
        return response.data;
    },

    async getAdCreative(adId: string): Promise<AdCreativeData> {
        const response = await apiClient.get(`/api/mutations/ads/${adId}/creative`);
        return response.data;
    }
};
