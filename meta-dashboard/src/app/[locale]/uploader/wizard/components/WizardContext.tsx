"use client";

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { GeoLocation, InterestTarget, CampaignCloneData } from '@/services/mutations.service';
import { CustomPinLocation } from '@/components/uploader/InteractiveLocationMap';

// Types for ad creative
export interface AdCreative {
    id: string;
    title: string;
    body: string;
    cta: string;
    link: string;
    file: File | null;
    previewUrl: string | null;
    leadFormId: string;
    // For cloned campaigns - store the existing image URL for preview
    existingImageUrl?: string;
    // For using existing FB/IG posts as ad creative
    useExistingPost?: boolean;
    objectStoryId?: string;  // Format: {page_id}_{post_id}
    objectStoryPreview?: {
        thumbnail?: string;
        message: string;
        source: 'facebook' | 'instagram';
    };
}

// Full wizard state
// Steps: 1=Objective, 2=Setup, 3=Location, 4=Targeting, 5=Budget, 6=Ads, 7=Review
export interface WizardState {
    currentStep: 1 | 2 | 3 | 4 | 5 | 6 | 7;

    // Step 1: Objective
    campaignName: string;
    objective: 'SALES' | 'LEADS' | 'TRAFFIC' | 'ENGAGEMENT' | 'WHATSAPP' | 'CALLS' | null;
    leadType: 'WEBSITE' | 'FORM' | null;

    // Step 2: Setup Check (pixel, lead forms, WhatsApp) - no additional state needed

    // Step 3: Location
    selectedLocations: GeoLocation[];
    customPins: CustomPinLocation[];

    // Step 4: Targeting
    audienceMode: 'advantage_plus' | 'custom';
    ageMin: number;
    ageMax: number;
    gender: 'all' | 'male' | 'female';
    platform: 'all' | 'facebook' | 'instagram';
    selectedAudiences: string[];
    excludedAudiences: string[];
    selectedInterests: InterestTarget[];
    selectedLanguages: number[];  // Facebook locale codes (e.g., 6 for English, 23 for Hebrew)

    // Step 5: Budget & Schedule
    dailyBudget: number;
    selectedPixel: string;
    selectedConversionEvent: string;
    useSchedule: boolean;
    startDate: string;  // YYYY-MM-DD format
    endDate: string;    // YYYY-MM-DD format

    // Step 6: Ads
    ads: AdCreative[];

    // Step 7: Review - no additional state needed
}

// Action types
type WizardAction =
    | { type: 'SET_STEP'; step: WizardState['currentStep'] }
    | { type: 'SET_CAMPAIGN_NAME'; name: string }
    | { type: 'SET_OBJECTIVE'; objective: WizardState['objective'] }
    | { type: 'SET_LEAD_TYPE'; leadType: WizardState['leadType'] }
    | { type: 'SET_LOCATIONS'; locations: GeoLocation[] }
    | { type: 'SET_CUSTOM_PINS'; pins: CustomPinLocation[] }
    | { type: 'ADD_CUSTOM_PIN'; pin: CustomPinLocation }
    | { type: 'UPDATE_CUSTOM_PIN'; id: string; updates: Partial<CustomPinLocation> }
    | { type: 'REMOVE_CUSTOM_PIN'; id: string }
    | { type: 'SET_AUDIENCE_MODE'; mode: WizardState['audienceMode'] }
    | { type: 'SET_AGE_RANGE'; ageMin: number; ageMax: number }
    | { type: 'SET_GENDER'; gender: WizardState['gender'] }
    | { type: 'SET_PLATFORM'; platform: WizardState['platform'] }
    | { type: 'SET_AUDIENCES'; audiences: string[] }
    | { type: 'SET_EXCLUDED_AUDIENCES'; audiences: string[] }
    | { type: 'SET_INTERESTS'; interests: InterestTarget[] }
    | { type: 'SET_LANGUAGES'; languages: number[] }
    | { type: 'SET_DAILY_BUDGET'; budget: number }
    | { type: 'SET_PIXEL'; pixelId: string }
    | { type: 'SET_CONVERSION_EVENT'; event: string }
    | { type: 'SET_USE_SCHEDULE'; useSchedule: boolean }
    | { type: 'SET_START_DATE'; date: string }
    | { type: 'SET_END_DATE'; date: string }
    | { type: 'SET_ADS'; ads: AdCreative[] }
    | { type: 'ADD_AD'; ad: AdCreative }
    | { type: 'UPDATE_AD'; id: string; updates: Partial<AdCreative> }
    | { type: 'REMOVE_AD'; id: string }
    | { type: 'DUPLICATE_AD'; id: string }
    | { type: 'PREFILL_FROM_CAMPAIGN'; data: CampaignCloneData }
    | { type: 'RESET' };

// Initial state
const initialState: WizardState = {
    currentStep: 1,
    campaignName: '',
    objective: null,
    leadType: null,
    selectedLocations: [],
    customPins: [],
    audienceMode: 'advantage_plus',
    ageMin: 18,
    ageMax: 65,
    gender: 'all',
    platform: 'all',
    selectedAudiences: [],
    excludedAudiences: [],
    selectedInterests: [],
    selectedLanguages: [],
    dailyBudget: 20,
    selectedPixel: '',
    selectedConversionEvent: '',
    useSchedule: false,
    startDate: '',
    endDate: '',
    ads: [{
        id: crypto.randomUUID(),
        title: '',
        body: '',
        cta: 'LEARN_MORE',
        link: '',
        file: null,
        previewUrl: null,
        leadFormId: ''
    }]
};

// Reducer
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
    switch (action.type) {
        case 'SET_STEP':
            return { ...state, currentStep: action.step };
        case 'SET_CAMPAIGN_NAME':
            return { ...state, campaignName: action.name };
        case 'SET_OBJECTIVE':
            return { ...state, objective: action.objective };
        case 'SET_LEAD_TYPE':
            return { ...state, leadType: action.leadType };
        case 'SET_LOCATIONS':
            return { ...state, selectedLocations: action.locations };
        case 'SET_CUSTOM_PINS':
            return { ...state, customPins: action.pins };
        case 'ADD_CUSTOM_PIN':
            return { ...state, customPins: [...state.customPins, action.pin] };
        case 'UPDATE_CUSTOM_PIN':
            return {
                ...state,
                customPins: state.customPins.map(p =>
                    p.id === action.id ? { ...p, ...action.updates } : p
                )
            };
        case 'REMOVE_CUSTOM_PIN':
            return { ...state, customPins: state.customPins.filter(p => p.id !== action.id) };
        case 'SET_AUDIENCE_MODE':
            return { ...state, audienceMode: action.mode };
        case 'SET_AGE_RANGE':
            return { ...state, ageMin: action.ageMin, ageMax: action.ageMax };
        case 'SET_GENDER':
            return { ...state, gender: action.gender };
        case 'SET_PLATFORM':
            return { ...state, platform: action.platform };
        case 'SET_AUDIENCES':
            return { ...state, selectedAudiences: action.audiences };
        case 'SET_EXCLUDED_AUDIENCES':
            return { ...state, excludedAudiences: action.audiences };
        case 'SET_INTERESTS':
            return { ...state, selectedInterests: action.interests };
        case 'SET_LANGUAGES':
            return { ...state, selectedLanguages: action.languages };
        case 'SET_DAILY_BUDGET':
            return { ...state, dailyBudget: action.budget };
        case 'SET_PIXEL':
            return { ...state, selectedPixel: action.pixelId };
        case 'SET_CONVERSION_EVENT':
            return { ...state, selectedConversionEvent: action.event };
        case 'SET_USE_SCHEDULE':
            return { ...state, useSchedule: action.useSchedule };
        case 'SET_START_DATE':
            return { ...state, startDate: action.date };
        case 'SET_END_DATE':
            return { ...state, endDate: action.date };
        case 'SET_ADS':
            return { ...state, ads: action.ads };
        case 'ADD_AD':
            return { ...state, ads: [...state.ads, action.ad] };
        case 'UPDATE_AD':
            return {
                ...state,
                ads: state.ads.map(ad =>
                    ad.id === action.id ? { ...ad, ...action.updates } : ad
                )
            };
        case 'REMOVE_AD':
            return { ...state, ads: state.ads.filter(ad => ad.id !== action.id) };
        case 'DUPLICATE_AD': {
            const sourceAd = state.ads.find(ad => ad.id === action.id);
            if (!sourceAd || state.ads.length >= 5) return state;
            const duplicatedAd: AdCreative = {
                ...sourceAd,
                id: crypto.randomUUID(),
            };
            return { ...state, ads: [...state.ads, duplicatedAd] };
        }
        case 'PREFILL_FROM_CAMPAIGN': {
            const { data } = action;

            // Map locations to GeoLocation format
            const locations: GeoLocation[] = data.targeting.locations.map(loc => ({
                key: loc.key,
                type: loc.type,
                name: loc.name,
                country_code: loc.country_code,
                display_name: loc.name
            }));

            // Determine gender from genders array
            let gender: 'all' | 'male' | 'female' = 'all';
            if (data.targeting.genders?.length === 1) {
                gender = data.targeting.genders[0] === 1 ? 'male' : 'female';
            }

            // Determine platform from publisher_platforms
            let platform: 'all' | 'facebook' | 'instagram' = 'all';
            if (data.targeting.publisher_platforms?.length === 1) {
                platform = data.targeting.publisher_platforms[0] as 'facebook' | 'instagram';
            }

            // Determine lead type based on first ad
            const firstAd = data.ads[0];
            const leadType = data.objective === 'LEADS'
                ? (firstAd?.lead_form_id ? 'FORM' : 'WEBSITE')
                : null;

            // Map ads to AdCreative format
            const ads: AdCreative[] = data.ads.slice(0, 5).map(ad => ({
                id: crypto.randomUUID(),
                title: ad.title || '',
                body: ad.body || '',
                cta: ad.call_to_action || 'LEARN_MORE',
                link: ad.link_url || '',
                file: null,  // Will need to be re-uploaded or use existing image
                previewUrl: ad.image_url || ad.video_url || null,
                leadFormId: ad.lead_form_id || '',
                existingImageUrl: ad.image_url || undefined
            }));

            // If no ads, create a blank one
            if (ads.length === 0) {
                ads.push({
                    id: crypto.randomUUID(),
                    title: '',
                    body: '',
                    cta: 'LEARN_MORE',
                    link: '',
                    file: null,
                    previewUrl: null,
                    leadFormId: ''
                });
            }

            return {
                ...state,
                currentStep: 1,
                campaignName: `${data.campaign_name} (Copy)`,
                objective: data.objective,
                leadType,
                selectedLocations: locations,
                customPins: [],
                ageMin: data.targeting.age_min,
                ageMax: data.targeting.age_max,
                gender,
                platform,
                dailyBudget: data.budget.daily_budget_cents / 100,  // Convert cents to dollars
                selectedPixel: data.pixel_id || '',
                selectedConversionEvent: data.conversion_event || '',
                ads
            };
        }
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

// Context
interface WizardContextType {
    state: WizardState;
    dispatch: React.Dispatch<WizardAction>;
}

const WizardContext = createContext<WizardContextType | null>(null);

// Provider
export function WizardProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(wizardReducer, initialState);
    return (
        <WizardContext.Provider value={{ state, dispatch }}>
            {children}
        </WizardContext.Provider>
    );
}

// Hook
export function useWizard() {
    const context = useContext(WizardContext);
    if (!context) {
        throw new Error('useWizard must be used within a WizardProvider');
    }
    return context;
}
