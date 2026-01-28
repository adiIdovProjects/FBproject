"use client";

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { GeoLocation, InterestTarget } from '@/services/mutations.service';

// Types for ad creative (simplified from wizard)
export interface CaptainAdCreative {
    id: string;
    adName: string;
    title: string;
    body: string;
    cta: string;
    link: string;
    file: File | null;
    previewUrl: string | null;
    leadFormId: string;
}

// Message in conversation
export interface CaptainMessage {
    id: string;
    role: 'captain' | 'user';
    content: string;
    timestamp: Date;
}

// Quick reply option
export interface QuickReplyOption {
    label: string;
    value: string;
    icon?: string;
    description?: string; // i18n key for description
}

// Flow types
export type CaptainFlow = 'create' | 'add' | 'edit' | null;
export type CaptainPhase = 'flow_select' | 'conversation' | 'summary' | 'submitting' | 'success' | 'error';
export type EditType = 'targeting' | 'creative' | null;

// Full captain state
export interface CaptainState {
    // Flow & phase
    flow: CaptainFlow;
    phase: CaptainPhase;
    editType: EditType;

    // Conversation
    messages: CaptainMessage[];
    currentQuestionId: string;
    questionHistory: string[]; // Track visited questions for back navigation
    isTyping: boolean;

    // Campaign data (mirrors WizardState)
    campaignName: string;
    objective: 'SALES' | 'LEADS' | 'TRAFFIC' | 'ENGAGEMENT' | 'WHATSAPP' | 'CALLS' | null;
    leadType: 'WEBSITE' | 'FORM' | null;

    // Targeting
    selectedLocations: GeoLocation[];
    targetingType: 'advantage' | 'custom' | null;
    ageMin: number;
    ageMax: number;
    gender: 'all' | 'male' | 'female';
    platform: 'all' | 'facebook' | 'instagram';

    // Custom targeting (when targetingType === 'custom')
    selectedInterests: InterestTarget[];
    selectedAudiences: string[]; // Custom audience IDs to include
    excludedAudiences: string[]; // Custom audience IDs to exclude

    // Adset name (auto-suggested based on targeting)
    adsetName: string;

    // Budget
    dailyBudget: number;
    selectedPixel: string;

    // Creative
    adFormat: 'single' | 'carousel';
    ads: CaptainAdCreative[];
    currentAdIndex: number; // Track which ad is being edited

    // For add/edit flows
    selectedCampaignId: string | null;
    selectedCampaignName: string | null;
    selectedAdSetId: string | null;
    selectedAdSetName: string | null;
    selectedAdId: string | null;

    // Result
    createdCampaignId: string | null;
    errorMessage: string | null;
}

// Action types
type CaptainAction =
    | { type: 'SET_FLOW'; flow: CaptainFlow }
    | { type: 'SET_PHASE'; phase: CaptainPhase }
    | { type: 'SET_EDIT_TYPE'; editType: EditType }
    | { type: 'SET_CURRENT_QUESTION'; questionId: string }
    | { type: 'ADD_MESSAGE'; message: CaptainMessage }
    | { type: 'SET_TYPING'; isTyping: boolean }
    | { type: 'SET_CAMPAIGN_NAME'; name: string }
    | { type: 'SET_OBJECTIVE'; objective: CaptainState['objective'] }
    | { type: 'SET_LEAD_TYPE'; leadType: CaptainState['leadType'] }
    | { type: 'SET_LOCATIONS'; locations: GeoLocation[] }
    | { type: 'SET_TARGETING_TYPE'; targetingType: CaptainState['targetingType'] }
    | { type: 'SET_ADSET_NAME'; name: string }
    | { type: 'SET_AGE_RANGE'; ageMin: number; ageMax: number }
    | { type: 'SET_GENDER'; gender: CaptainState['gender'] }
    | { type: 'SET_PLATFORM'; platform: CaptainState['platform'] }
    | { type: 'SET_INTERESTS'; interests: InterestTarget[] }
    | { type: 'ADD_INTEREST'; interest: InterestTarget }
    | { type: 'REMOVE_INTEREST'; interestId: string }
    | { type: 'SET_AUDIENCES'; audiences: string[] }
    | { type: 'SET_EXCLUDED_AUDIENCES'; audiences: string[] }
    | { type: 'SET_DAILY_BUDGET'; budget: number }
    | { type: 'SET_PIXEL'; pixelId: string }
    | { type: 'SET_AD_FORMAT'; format: CaptainState['adFormat'] }
    | { type: 'SET_ADS'; ads: CaptainAdCreative[] }
    | { type: 'UPDATE_AD'; id: string; updates: Partial<CaptainAdCreative> }
    | { type: 'UPDATE_CURRENT_AD'; updates: Partial<CaptainAdCreative> }
    | { type: 'SET_SELECTED_CAMPAIGN'; campaignId: string | null; campaignName: string | null }
    | { type: 'SET_SELECTED_ADSET'; adSetId: string | null; adSetName: string | null }
    | { type: 'SET_SELECTED_AD'; adId: string | null }
    | { type: 'SET_CREATED_CAMPAIGN'; campaignId: string }
    | { type: 'SET_ERROR'; message: string | null }
    | { type: 'GO_TO_SUMMARY' }
    | { type: 'BACK_TO_CHAT' }
    | { type: 'GO_TO_STEP'; questionId: string } // Navigate to specific step
    | { type: 'GO_BACK' } // Go back to previous question
    | { type: 'ADD_NEW_AD'; mode: 'same_creative' | 'same_copy' | 'scratch' } // Add another ad
    | { type: 'DUPLICATE_AD'; index: number } // Duplicate an ad entirely
    | { type: 'DELETE_AD'; index: number } // Delete an ad
    | { type: 'SET_CURRENT_AD_INDEX'; index: number } // Switch between ads
    | { type: 'RESET' };

// Helper to create a new blank ad
const createBlankAd = (): CaptainAdCreative => ({
    id: crypto.randomUUID(),
    adName: '',
    title: '',
    body: '',
    cta: 'LEARN_MORE',
    link: '',
    file: null,
    previewUrl: null,
    leadFormId: '',
});

// Initial state
const initialState: CaptainState = {
    flow: null,
    phase: 'flow_select',
    editType: null,
    messages: [],
    currentQuestionId: '',
    questionHistory: [],
    isTyping: false,
    campaignName: '',
    objective: null,
    leadType: null,
    selectedLocations: [],
    targetingType: null,
    ageMin: 18,
    ageMax: 65,
    gender: 'all',
    platform: 'all',
    selectedInterests: [],
    selectedAudiences: [],
    excludedAudiences: [],
    adsetName: '',
    dailyBudget: 20,
    adFormat: 'single',
    selectedPixel: '',
    ads: [createBlankAd()],
    currentAdIndex: 0,
    selectedCampaignId: null,
    selectedCampaignName: null,
    selectedAdSetId: null,
    selectedAdSetName: null,
    selectedAdId: null,
    createdCampaignId: null,
    errorMessage: null,
};

// Reducer
function captainReducer(state: CaptainState, action: CaptainAction): CaptainState {
    switch (action.type) {
        case 'SET_FLOW':
            return {
                ...state,
                flow: action.flow,
                phase: 'conversation',
                currentQuestionId: 'welcome',
                questionHistory: []
            };
        case 'SET_PHASE':
            return { ...state, phase: action.phase };
        case 'SET_EDIT_TYPE':
            return { ...state, editType: action.editType };
        case 'SET_CURRENT_QUESTION':
            // Add current question to history before moving to next
            return {
                ...state,
                questionHistory: state.currentQuestionId
                    ? [...state.questionHistory, state.currentQuestionId]
                    : state.questionHistory,
                currentQuestionId: action.questionId
            };
        case 'ADD_MESSAGE':
            return { ...state, messages: [...state.messages, action.message] };
        case 'SET_TYPING':
            return { ...state, isTyping: action.isTyping };
        case 'SET_CAMPAIGN_NAME':
            return { ...state, campaignName: action.name };
        case 'SET_OBJECTIVE':
            return { ...state, objective: action.objective };
        case 'SET_LEAD_TYPE':
            return { ...state, leadType: action.leadType };
        case 'SET_LOCATIONS':
            return { ...state, selectedLocations: action.locations };
        case 'SET_TARGETING_TYPE':
            return { ...state, targetingType: action.targetingType };
        case 'SET_ADSET_NAME':
            return { ...state, adsetName: action.name };
        case 'SET_AGE_RANGE':
            return { ...state, ageMin: action.ageMin, ageMax: action.ageMax };
        case 'SET_GENDER':
            return { ...state, gender: action.gender };
        case 'SET_PLATFORM':
            return { ...state, platform: action.platform };
        case 'SET_INTERESTS':
            return { ...state, selectedInterests: action.interests };
        case 'ADD_INTEREST':
            // Prevent duplicates
            if (state.selectedInterests.some(i => i.id === action.interest.id)) {
                return state;
            }
            return { ...state, selectedInterests: [...state.selectedInterests, action.interest] };
        case 'REMOVE_INTEREST':
            return { ...state, selectedInterests: state.selectedInterests.filter(i => i.id !== action.interestId) };
        case 'SET_AUDIENCES':
            return { ...state, selectedAudiences: action.audiences };
        case 'SET_EXCLUDED_AUDIENCES':
            return { ...state, excludedAudiences: action.audiences };
        case 'SET_DAILY_BUDGET':
            return { ...state, dailyBudget: action.budget };
        case 'SET_AD_FORMAT':
            return { ...state, adFormat: action.format };
        case 'SET_PIXEL':
            return { ...state, selectedPixel: action.pixelId };
        case 'SET_ADS':
            return { ...state, ads: action.ads };
        case 'UPDATE_AD':
            return {
                ...state,
                ads: state.ads.map(ad =>
                    ad.id === action.id ? { ...ad, ...action.updates } : ad
                )
            };
        case 'UPDATE_CURRENT_AD':
            return {
                ...state,
                ads: state.ads.map((ad, i) =>
                    i === state.currentAdIndex ? { ...ad, ...action.updates } : ad
                )
            };
        case 'SET_SELECTED_CAMPAIGN':
            return { ...state, selectedCampaignId: action.campaignId, selectedCampaignName: action.campaignName };
        case 'SET_SELECTED_ADSET':
            return { ...state, selectedAdSetId: action.adSetId, selectedAdSetName: action.adSetName };
        case 'SET_SELECTED_AD':
            return { ...state, selectedAdId: action.adId };
        case 'SET_CREATED_CAMPAIGN':
            return { ...state, createdCampaignId: action.campaignId, phase: 'success' };
        case 'SET_ERROR':
            return { ...state, errorMessage: action.message, phase: action.message ? 'error' : state.phase };
        case 'GO_TO_SUMMARY':
            return { ...state, phase: 'summary' };
        case 'BACK_TO_CHAT':
            return { ...state, phase: 'conversation' };
        case 'GO_TO_STEP': {
            // Navigate to a specific step by finding its index in history
            const stepIndex = state.questionHistory.indexOf(action.questionId);
            if (stepIndex === -1) return state;
            return {
                ...state,
                questionHistory: state.questionHistory.slice(0, stepIndex),
                currentQuestionId: action.questionId
            };
        }
        case 'GO_BACK': {
            // Go back to previous question in history
            if (state.questionHistory.length === 0) return state;
            const newHistory = [...state.questionHistory];
            const previousQuestion = newHistory.pop()!;
            return {
                ...state,
                questionHistory: newHistory,
                currentQuestionId: previousQuestion
            };
        }
        case 'ADD_NEW_AD': {
            const currentAd = state.ads[state.currentAdIndex];
            let newAd: CaptainAdCreative;

            if (action.mode === 'same_creative') {
                // Keep image, clear text
                newAd = {
                    ...createBlankAd(),
                    file: currentAd.file,
                    previewUrl: currentAd.previewUrl,
                };
            } else if (action.mode === 'same_copy') {
                // Keep text, clear image
                newAd = {
                    ...createBlankAd(),
                    title: currentAd.title,
                    body: currentAd.body,
                    cta: currentAd.cta,
                    link: currentAd.link,
                };
            } else {
                // Start from scratch
                newAd = createBlankAd();
            }

            return {
                ...state,
                ads: [...state.ads, newAd],
                currentAdIndex: state.ads.length, // Point to new ad
            };
        }
        case 'DUPLICATE_AD': {
            const adToDuplicate = state.ads[action.index];
            if (!adToDuplicate) return state;
            const duplicatedAd: CaptainAdCreative = {
                ...adToDuplicate,
                id: crypto.randomUUID(),
                adName: adToDuplicate.adName ? `${adToDuplicate.adName} (copy)` : '',
            };
            const newAds = [...state.ads];
            newAds.splice(action.index + 1, 0, duplicatedAd);
            return {
                ...state,
                ads: newAds,
                currentAdIndex: action.index + 1,
            };
        }
        case 'DELETE_AD': {
            if (state.ads.length <= 1) return state; // Keep at least one ad
            const newAds = state.ads.filter((_, i) => i !== action.index);
            const newIndex = action.index >= newAds.length ? newAds.length - 1 : action.index;
            return {
                ...state,
                ads: newAds,
                currentAdIndex: newIndex,
            };
        }
        case 'SET_CURRENT_AD_INDEX':
            return {
                ...state,
                currentAdIndex: Math.max(0, Math.min(action.index, state.ads.length - 1)),
            };
        case 'RESET':
            return { ...initialState, ads: [createBlankAd()] };
        default:
            return state;
    }
}

// Context
interface CaptainContextType {
    state: CaptainState;
    dispatch: React.Dispatch<CaptainAction>;
}

const CaptainContext = createContext<CaptainContextType | null>(null);

// Provider
export function CaptainProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(captainReducer, initialState);
    return (
        <CaptainContext.Provider value={{ state, dispatch }}>
            {children}
        </CaptainContext.Provider>
    );
}

// Hook
export function useCaptain() {
    const context = useContext(CaptainContext);
    if (!context) {
        throw new Error('useCaptain must be used within a CaptainProvider');
    }
    return context;
}
