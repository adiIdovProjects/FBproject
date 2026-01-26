"use client";

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { GeoLocation, InterestTarget } from '@/services/mutations.service';

// Types for ad creative (simplified from wizard)
export interface CaptainAdCreative {
    id: string;
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
    isTyping: boolean;

    // Campaign data (mirrors WizardState)
    campaignName: string;
    objective: 'SALES' | 'LEADS' | 'TRAFFIC' | 'ENGAGEMENT' | 'WHATSAPP' | 'CALLS' | null;
    leadType: 'WEBSITE' | 'FORM' | null;

    // Targeting
    selectedLocations: GeoLocation[];
    ageMin: number;
    ageMax: number;
    gender: 'all' | 'male' | 'female';
    platform: 'all' | 'facebook' | 'instagram';

    // Budget
    dailyBudget: number;
    selectedPixel: string;

    // Creative
    ads: CaptainAdCreative[];

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
    | { type: 'SET_AGE_RANGE'; ageMin: number; ageMax: number }
    | { type: 'SET_GENDER'; gender: CaptainState['gender'] }
    | { type: 'SET_PLATFORM'; platform: CaptainState['platform'] }
    | { type: 'SET_DAILY_BUDGET'; budget: number }
    | { type: 'SET_PIXEL'; pixelId: string }
    | { type: 'SET_ADS'; ads: CaptainAdCreative[] }
    | { type: 'UPDATE_AD'; id: string; updates: Partial<CaptainAdCreative> }
    | { type: 'SET_SELECTED_CAMPAIGN'; campaignId: string | null; campaignName: string | null }
    | { type: 'SET_SELECTED_ADSET'; adSetId: string | null; adSetName: string | null }
    | { type: 'SET_SELECTED_AD'; adId: string | null }
    | { type: 'SET_CREATED_CAMPAIGN'; campaignId: string }
    | { type: 'SET_ERROR'; message: string | null }
    | { type: 'GO_TO_SUMMARY' }
    | { type: 'BACK_TO_CHAT' }
    | { type: 'RESET' };

// Initial state
const initialState: CaptainState = {
    flow: null,
    phase: 'flow_select',
    editType: null,
    messages: [],
    currentQuestionId: '',
    isTyping: false,
    campaignName: '',
    objective: null,
    leadType: null,
    selectedLocations: [],
    ageMin: 18,
    ageMax: 65,
    gender: 'all',
    platform: 'all',
    dailyBudget: 20,
    selectedPixel: '',
    ads: [{
        id: crypto.randomUUID(),
        title: '',
        body: '',
        cta: 'LEARN_MORE',
        link: '',
        file: null,
        previewUrl: null,
        leadFormId: '',
    }],
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
            return { ...state, flow: action.flow, phase: 'conversation', currentQuestionId: 'welcome' };
        case 'SET_PHASE':
            return { ...state, phase: action.phase };
        case 'SET_EDIT_TYPE':
            return { ...state, editType: action.editType };
        case 'SET_CURRENT_QUESTION':
            return { ...state, currentQuestionId: action.questionId };
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
        case 'SET_AGE_RANGE':
            return { ...state, ageMin: action.ageMin, ageMax: action.ageMax };
        case 'SET_GENDER':
            return { ...state, gender: action.gender };
        case 'SET_PLATFORM':
            return { ...state, platform: action.platform };
        case 'SET_DAILY_BUDGET':
            return { ...state, dailyBudget: action.budget };
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
        case 'RESET':
            return initialState;
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
