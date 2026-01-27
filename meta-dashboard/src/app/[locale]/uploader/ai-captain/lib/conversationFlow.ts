import { CaptainFlow, QuickReplyOption } from '../components/CaptainContext';

// Conversation node definition
export interface ConversationNode {
    id: string;
    questionKey: string; // i18n key
    inputType: 'quick_reply' | 'text' | 'location_search' | 'file_upload' | 'campaign_select' | 'adset_select' | 'budget' | 'age_range' | 'lead_type_select' | 'add_another_ad' | 'targeting_type_select' | 'ad_format_select' | 'interest_search' | 'audience_select';
    options?: QuickReplyOption[];
    placeholder?: string;
    nextNode: (answer: string, state: any) => string | 'summary';
    validate?: (answer: string) => boolean;
}

// Quick reply options for objectives
const OBJECTIVE_OPTIONS: QuickReplyOption[] = [
    { label: 'Sales', value: 'SALES', icon: '💰', description: 'captain.objective_desc_sales' },
    { label: 'Leads', value: 'LEADS', icon: '📋', description: 'captain.objective_desc_leads' },
    { label: 'Traffic', value: 'TRAFFIC', icon: '🌐', description: 'captain.objective_desc_traffic' },
    { label: 'Engagement', value: 'ENGAGEMENT', icon: '❤️', description: 'captain.objective_desc_engagement' },
    { label: 'WhatsApp', value: 'WHATSAPP', icon: '💬', description: 'captain.objective_desc_whatsapp' },
    { label: 'Calls', value: 'CALLS', icon: '📞', description: 'captain.objective_desc_calls' },
];

const LEAD_TYPE_OPTIONS: QuickReplyOption[] = [
    { label: 'Website', value: 'WEBSITE', icon: '🔗', description: 'captain.lead_type_website_desc' },
    { label: 'Instant Form', value: 'FORM', icon: '📝', description: 'captain.lead_type_form_desc' },
];

const ADD_ANOTHER_OPTIONS: QuickReplyOption[] = [
    { label: 'Same creative, different copy', value: 'same_creative', icon: '📝' },
    { label: 'Same copy, different creative', value: 'same_copy', icon: '🖼️' },
    { label: 'Start from scratch', value: 'scratch', icon: '✨' },
    { label: 'Done adding ads', value: 'done', icon: '✅' },
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

const TARGETING_TYPE_OPTIONS: QuickReplyOption[] = [
    { label: 'Advantage+', value: 'advantage', icon: '🚀', description: 'captain.targeting_advantage_desc' },
    { label: 'Custom', value: 'custom', icon: '🎯', description: 'captain.targeting_custom_desc' },
];

const AD_FORMAT_OPTIONS: QuickReplyOption[] = [
    { label: 'Single Image/Video', value: 'single', icon: '🖼️', description: 'captain.ad_format_single_desc' },
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
        inputType: 'lead_type_select',
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
        nextNode: () => 'targeting_type',
    },
    targeting_type: {
        id: 'targeting_type',
        questionKey: 'captain.ask_targeting_type',
        inputType: 'targeting_type_select',
        options: TARGETING_TYPE_OPTIONS,
        nextNode: (answer) => answer === 'advantage' ? 'age' : 'audiences',
    },
    audiences: {
        id: 'audiences',
        questionKey: 'captain.ask_audiences',
        inputType: 'audience_select',
        nextNode: () => 'interests',
    },
    interests: {
        id: 'interests',
        questionKey: 'captain.ask_interests',
        inputType: 'interest_search',
        nextNode: () => 'age',
    },
    age: {
        id: 'age',
        questionKey: 'captain.ask_age',
        inputType: 'age_range',
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
    ad_format: {
        id: 'ad_format',
        questionKey: 'captain.ask_ad_format',
        inputType: 'ad_format_select',
        options: AD_FORMAT_OPTIONS,
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
        nextNode: (_, state) => {
            // Skip link for WhatsApp and Calls objectives
            if (state.objective === 'WHATSAPP' || state.objective === 'CALLS') {
                return 'cta';
            }
            // Skip link for instant forms
            if (state.leadType === 'FORM') {
                return 'cta';
            }
            return 'link';
        },
        validate: (answer) => answer.trim().length > 0,
    },
    link: {
        id: 'link',
        questionKey: 'captain.ask_link',
        inputType: 'text',
        placeholder: 'captain.placeholder_link',
        nextNode: () => 'cta',
        validate: (answer) => {
            if (!answer.trim()) return false;
            try {
                const url = new URL(answer);
                return url.protocol === 'http:' || url.protocol === 'https:';
            } catch {
                return false;
            }
        },
    },
    cta: {
        id: 'cta',
        questionKey: 'captain.ask_cta',
        inputType: 'quick_reply',
        options: CTA_OPTIONS,
        nextNode: () => 'add_another_ad',
    },
    add_another_ad: {
        id: 'add_another_ad',
        questionKey: 'captain.ask_add_another',
        inputType: 'add_another_ad',
        options: ADD_ANOTHER_OPTIONS,
        nextNode: (answer) => {
            if (answer === 'done') return 'summary';
            if (answer === 'same_creative') return 'headline';
            if (answer === 'same_copy') return 'creative';
            return 'creative'; // scratch
        },
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
        inputType: 'age_range',
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
