import { apiClient } from './apiClient';

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
    type: 'country' | 'region' | 'city' | 'custom_location';
    name: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    radius?: number; // km for custom_location
}

export interface InterestTarget {
    id: string;
    name: string;
}

export interface SmartCampaignRequest {
    account_id: string;
    page_id: string;
    campaign_name: string;
    objective: 'SALES' | 'LEADS' | 'TRAFFIC' | 'ENGAGEMENT' | 'WHATSAPP' | 'CALLS';
    geo_locations: GeoLocationTarget[];
    age_min: number;
    age_max: number;
    genders?: number[];  // [1] = male, [2] = female, undefined = all
    publisher_platforms?: string[];  // ['facebook'], ['instagram'], or undefined for all
    daily_budget_cents: number;
    custom_audiences?: string[];  // Optional custom audience IDs (lookalikes, saved audiences)
    excluded_audiences?: string[];  // Optional custom audience IDs to exclude
    interests?: InterestTarget[];  // Optional interest targeting
    locales?: number[];  // Optional language targeting (Facebook locale codes)
    pixel_id?: string;  // Required for SALES objective
    conversion_event?: string;  // Conversion event for pixel optimization
    creative: SmartCreative;
    adset_name?: string;  // Optional custom ad set name
    ad_name?: string;     // Optional custom ad name
    start_date?: string;  // Campaign start date (YYYY-MM-DD)
    end_date?: string;    // Campaign end date (YYYY-MM-DD)
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

export interface LeadFormDetails {
    id: string;
    name: string;
    status: string;
    created_time?: string;
    questions: string[];  // Standard question types like EMAIL, FULL_NAME, etc.
    custom_questions: Array<{
        label: string;
        field_type: string;
        options: string[];
        allow_multiple?: boolean;
    }>;
    privacy_policy_url?: string;
    headline?: string;
    description?: string;
    thank_you_title?: string;
    thank_you_body?: string;
    thank_you_button_text?: string;
    thank_you_url?: string;
}

export interface CampaignCloneData {
    campaign_id: string;
    campaign_name: string;
    objective: 'SALES' | 'LEADS' | 'TRAFFIC' | 'ENGAGEMENT' | 'WHATSAPP' | 'CALLS';
    targeting: {
        locations: Array<{
            key: string;
            type: 'country' | 'region' | 'city';
            name: string;
            country_code?: string;
        }>;
        age_min: number;
        age_max: number;
        genders?: number[];
        publisher_platforms?: string[];
    };
    budget: {
        daily_budget_cents: number;
    };
    pixel_id?: string;
    conversion_event?: string;
    ads: Array<{
        ad_id: string;
        ad_name: string;
        title: string;
        body: string;
        link_url: string;
        call_to_action: string;
        lead_form_id?: string;
        image_url?: string;
        video_url?: string;
    }>;
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
    latitude?: number;
    longitude?: number;
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

export interface BudgetRecommendation {
    has_historical_data: boolean;
    average_daily_spend: number;
    recommended_budget: {
        SALES: number;
        LEADS: number;
        TRAFFIC: number;
        ENGAGEMENT: number;
    };
    min_budget: number;
    currency: string;
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

    async getLeadFormDetails(formId: string, pageId: string, accountId?: string): Promise<LeadFormDetails> {
        const response = await apiClient.get(`/api/mutations/lead-forms/${formId}`, {
            params: { page_id: pageId, account_id: accountId }
        });
        return response.data;
    },

    async checkWhatsAppStatus(pageId: string): Promise<{ connected: boolean; whatsapp_business_account_id: string | null }> {
        const response = await apiClient.get(`/api/mutations/pages/${pageId}/whatsapp-status`);
        return response.data;
    },

    async createLeadForm(
        pageId: string,
        formName: string,
        questions: string[],
        privacyPolicyUrl: string,
        accountId?: string,
        options?: {
            headline?: string;
            description?: string;
            customQuestions?: Array<{ label: string; field_type: string; options?: string[]; allow_multiple?: boolean }>;
            thankYouTitle?: string;
            thankYouBody?: string;
            thankYouButtonText?: string;
            thankYouUrl?: string;
        }
    ): Promise<{ id: string; name: string; status: string }> {
        const response = await apiClient.post('/api/mutations/lead-forms', {
            page_id: pageId,
            form_name: formName,
            questions: questions,
            privacy_policy_url: privacyPolicyUrl,
            account_id: accountId,
            headline: options?.headline,
            description: options?.description,
            custom_questions: options?.customQuestions,
            thank_you_title: options?.thankYouTitle,
            thank_you_body: options?.thankYouBody,
            thank_you_button_text: options?.thankYouButtonText,
            thank_you_url: options?.thankYouUrl
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

    async createCustomAudience(
        accountId: string,
        name: string,
        pixelId: string,
        eventType: string = 'PageView',
        retentionDays: number = 30
    ): Promise<CustomAudience> {
        const response = await apiClient.post('/api/mutations/custom-audiences', {
            account_id: accountId,
            name: name,
            pixel_id: pixelId,
            event_type: eventType,
            retention_days: retentionDays
        });
        return response.data;
    },

    async createPageEngagementAudience(
        accountId: string,
        name: string,
        pageId: string,
        engagementType: string = 'page_engaged',
        retentionDays: number = 365
    ): Promise<CustomAudience> {
        const response = await apiClient.post('/api/mutations/page-engagement-audiences', {
            account_id: accountId,
            name: name,
            page_id: pageId,
            engagement_type: engagementType,
            retention_days: retentionDays
        });
        return response.data;
    },

    async createLookalikeAudience(
        accountId: string,
        name: string,
        sourceAudienceId: string,
        countryCode: string,
        ratio: number = 0.01
    ): Promise<CustomAudience> {
        const response = await apiClient.post('/api/mutations/lookalike-audiences', {
            account_id: accountId,
            name: name,
            source_audience_id: sourceAudienceId,
            country_code: countryCode,
            ratio: ratio
        });
        return response.data;
    },

    async searchLocations(query: string, locationTypes: string[] = ['country', 'region', 'city'], locale?: string): Promise<GeoLocation[]> {
        const response = await apiClient.get('/api/mutations/targeting/search', {
            params: { q: query, location_types: locationTypes.join(','), ...(locale && { locale }) }
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

    async getCampaignCloneData(campaignId: string): Promise<CampaignCloneData> {
        const response = await apiClient.get(`/api/mutations/campaigns/${campaignId}/clone-data`);
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
    },

    // --- Budget Recommendation ---

    async getBudgetRecommendation(accountId: string): Promise<BudgetRecommendation> {
        const response = await apiClient.get('/api/mutations/budget-recommendation', {
            params: { account_id: accountId }
        });
        return response.data;
    },

    // --- Lead Retrieval ---

    async getLeads(
        leadFormId: string,
        pageId: string,
        accountId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<{ leads: Record<string, string>[]; total: number }> {
        const response = await apiClient.get('/api/mutations/leads', {
            params: {
                lead_form_id: leadFormId,
                page_id: pageId,
                account_id: accountId,
                start_date: startDate,
                end_date: endDate
            }
        });
        return response.data;
    },

    async exportLeadsCsv(
        leadFormId: string,
        pageId: string,
        accountId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<Blob> {
        const response = await apiClient.get('/api/mutations/leads/export', {
            params: {
                lead_form_id: leadFormId,
                page_id: pageId,
                account_id: accountId,
                start_date: startDate,
                end_date: endDate
            },
            responseType: 'blob'
        });
        return response.data;
    }
};
