import { CaptainFlow, QuickReplyOption } from '../components/CaptainContext';

// Conversation node definition
export interface ConversationNode {
    id: string;
    questionKey: string; // i18n key
    inputType: 'quick_reply' | 'text' | 'location_search' | 'file_upload' | 'campaign_select' | 'adset_select' | 'budget';
    options?: QuickReplyOption[];
    placeholder?: string;
    nextNode: (answer: string, state: any) => string | 'summary';
    validate?: (answer: string) => boolean;
}

// Quick reply options for objectives
const OBJECTIVE_OPTIONS: QuickReplyOption[] = [
    { label: 'Sales', value: 'SALES', icon: '💰' },
    { label: 'Leads', value: 'LEADS', icon: '📋' },
    { label: 'Traffic', value: 'TRAFFIC', icon: '🌐' },
    { label: 'Engagement', value: 'ENGAGEMENT', icon: '❤️' },
];

const LEAD_TYPE_OPTIONS: QuickReplyOption[] = [
    { label: 'Website', value: 'WEBSITE', icon: '🔗' },
    { label: 'Instant Form', value: 'FORM', icon: '📝' },
];

const AGE_OPTIONS: QuickReplyOption[] = [
    { label: '18-24', value: '18-24', icon: '👶' },
    { label: '25-34', value: '25-34', icon: '🧑' },
    { label: '35-44', value: '35-44', icon: '👨' },
    { label: '45-65', value: '45-65', icon: '👴' },
    { label: 'All Ages', value: 'all', icon: '👥' },
];

const GENDER_OPTIONS: QuickReplyOption[] = [
    { label: 'All Genders', value: 'all', icon: '👥' },
    { label: 'Male', value: 'male', icon: '👨' },
    { label: 'Female', value: 'female', icon: '👩' },
];

const PLATFORM_OPTIONS: QuickReplyOption[] = [
    { label: 'Both', value: 'all', icon: '📱' },
    { label: 'Facebook', value: 'facebook', icon: '📘' },
    { label: 'Instagram', value: 'instagram', icon: '📸' },
];

const CTA_OPTIONS: QuickReplyOption[] = [
    { label: 'Learn More', value: 'LEARN_MORE' },
    { label: 'Shop Now', value: 'SHOP_NOW' },
    { label: 'Sign Up', value: 'SIGN_UP' },
    { label: 'Contact Us', value: 'CONTACT_US' },
];

const EDIT_TYPE_OPTIONS: QuickReplyOption[] = [
    { label: 'Edit Targeting', value: 'targeting', icon: '🎯' },
    { label: 'Edit Ad Creative', value: 'creative', icon: '🖼️' },
];

// Create campaign flow nodes
export const CREATE_FLOW_NODES: Record<string, ConversationNode> = {
    welcome: {
        id: 'welcome',
        questionKey: 'captain.welcome_create',
        inputType: 'quick_reply',
        options: OBJECTIVE_OPTIONS,
        nextNode: (answer) => answer === 'LEADS' ? 'lead_type' : 'campaign_name',
    },
    lead_type: {
        id: 'lead_type',
        questionKey: 'captain.ask_lead_type',
        inputType: 'quick_reply',
        options: LEAD_TYPE_OPTIONS,
        nextNode: () => 'campaign_name',
    },
    campaign_name: {
        id: 'campaign_name',
        questionKey: 'captain.ask_campaign_name',
        inputType: 'text',
        placeholder: 'captain.placeholder_campaign_name',
        nextNode: () => 'location',
        validate: (answer) => answer.trim().length > 0,
    },
    location: {
        id: 'location',
        questionKey: 'captain.ask_location',
        inputType: 'location_search',
        nextNode: () => 'age',
    },
    age: {
        id: 'age',
        questionKey: 'captain.ask_age',
        inputType: 'quick_reply',
        options: AGE_OPTIONS,
        nextNode: () => 'gender',
    },
    gender: {
        id: 'gender',
        questionKey: 'captain.ask_gender',
        inputType: 'quick_reply',
        options: GENDER_OPTIONS,
        nextNode: () => 'platform',
    },
    platform: {
        id: 'platform',
        questionKey: 'captain.ask_platform',
        inputType: 'quick_reply',
        options: PLATFORM_OPTIONS,
        nextNode: () => 'budget',
    },
    budget: {
        id: 'budget',
        questionKey: 'captain.ask_budget',
        inputType: 'budget',
        placeholder: 'captain.placeholder_budget',
        nextNode: () => 'creative',
        validate: (answer) => {
            const num = parseFloat(answer);
            return !isNaN(num) && num >= 5;
        },
    },
    creative: {
        id: 'creative',
        questionKey: 'captain.ask_creative',
        inputType: 'file_upload',
        nextNode: () => 'headline',
    },
    headline: {
        id: 'headline',
        questionKey: 'captain.ask_headline',
        inputType: 'text',
        placeholder: 'captain.placeholder_headline',
        nextNode: () => 'body',
        validate: (answer) => answer.trim().length > 0,
    },
    body: {
        id: 'body',
        questionKey: 'captain.ask_body',
        inputType: 'text',
        placeholder: 'captain.placeholder_body',
        nextNode: () => 'link',
        validate: (answer) => answer.trim().length > 0,
    },
    link: {
        id: 'link',
        questionKey: 'captain.ask_link',
        inputType: 'text',
        placeholder: 'captain.placeholder_link',
        nextNode: (_, state) => state.leadType === 'FORM' ? 'cta' : 'cta',
        validate: (answer) => {
            try {
                new URL(answer);
                return true;
            } catch {
                return answer === '' || answer.startsWith('http');
            }
        },
    },
    cta: {
        id: 'cta',
        questionKey: 'captain.ask_cta',
        inputType: 'quick_reply',
        options: CTA_OPTIONS,
        nextNode: () => 'summary',
    },
};

// Add creative flow nodes
export const ADD_FLOW_NODES: Record<string, ConversationNode> = {
    welcome: {
        id: 'welcome',
        questionKey: 'captain.welcome_add',
        inputType: 'campaign_select',
        nextNode: () => 'adset_select',
    },
    adset_select: {
        id: 'adset_select',
        questionKey: 'captain.ask_adset',
        inputType: 'adset_select',
        nextNode: () => 'creative',
    },
    creative: {
        id: 'creative',
        questionKey: 'captain.ask_creative',
        inputType: 'file_upload',
        nextNode: () => 'headline',
    },
    headline: {
        id: 'headline',
        questionKey: 'captain.ask_headline',
        inputType: 'text',
        placeholder: 'captain.placeholder_headline',
        nextNode: () => 'body',
        validate: (answer) => answer.trim().length > 0,
    },
    body: {
        id: 'body',
        questionKey: 'captain.ask_body',
        inputType: 'text',
        placeholder: 'captain.placeholder_body',
        nextNode: () => 'link',
        validate: (answer) => answer.trim().length > 0,
    },
    link: {
        id: 'link',
        questionKey: 'captain.ask_link',
        inputType: 'text',
        placeholder: 'captain.placeholder_link',
        nextNode: () => 'cta',
    },
    cta: {
        id: 'cta',
        questionKey: 'captain.ask_cta',
        inputType: 'quick_reply',
        options: CTA_OPTIONS,
        nextNode: () => 'summary',
    },
};

// Edit flow nodes
export const EDIT_FLOW_NODES: Record<string, ConversationNode> = {
    welcome: {
        id: 'welcome',
        questionKey: 'captain.welcome_edit',
        inputType: 'quick_reply',
        options: EDIT_TYPE_OPTIONS,
        nextNode: () => 'campaign_select',
    },
    campaign_select: {
        id: 'campaign_select',
        questionKey: 'captain.ask_campaign',
        inputType: 'campaign_select',
        nextNode: () => 'adset_select',
    },
    adset_select: {
        id: 'adset_select',
        questionKey: 'captain.ask_adset',
        inputType: 'adset_select',
        nextNode: (_, state) => state.editType === 'targeting' ? 'edit_location' : 'ad_select',
    },
    ad_select: {
        id: 'ad_select',
        questionKey: 'captain.ask_ad',
        inputType: 'adset_select', // Reuse for ad selection
        nextNode: () => 'edit_creative',
    },
    edit_location: {
        id: 'edit_location',
        questionKey: 'captain.ask_new_location',
        inputType: 'location_search',
        nextNode: () => 'edit_age',
    },
    edit_age: {
        id: 'edit_age',
        questionKey: 'captain.ask_new_age',
        inputType: 'quick_reply',
        options: AGE_OPTIONS,
        nextNode: () => 'summary',
    },
    edit_creative: {
        id: 'edit_creative',
        questionKey: 'captain.ask_new_creative',
        inputType: 'file_upload',
        nextNode: () => 'edit_headline',
    },
    edit_headline: {
        id: 'edit_headline',
        questionKey: 'captain.ask_new_headline',
        inputType: 'text',
        placeholder: 'captain.placeholder_headline',
        nextNode: () => 'edit_body',
    },
    edit_body: {
        id: 'edit_body',
        questionKey: 'captain.ask_new_body',
        inputType: 'text',
        placeholder: 'captain.placeholder_body',
        nextNode: () => 'summary',
    },
};

// Get flow nodes by flow type
export function getFlowNodes(flow: CaptainFlow): Record<string, ConversationNode> {
    switch (flow) {
        case 'create':
            return CREATE_FLOW_NODES;
        case 'add':
            return ADD_FLOW_NODES;
        case 'edit':
            return EDIT_FLOW_NODES;
        default:
            return {};
    }
}

// Get current node
export function getCurrentNode(flow: CaptainFlow, questionId: string): ConversationNode | null {
    const nodes = getFlowNodes(flow);
    return nodes[questionId] || null;
}

// Parse age range from answer
export function parseAgeRange(answer: string): { ageMin: number; ageMax: number } {
    if (answer === 'all') return { ageMin: 18, ageMax: 65 };
    const [min, max] = answer.split('-').map(Number);
    return { ageMin: min || 18, ageMax: max || 65 };
}
