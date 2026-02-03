"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Send, Search, MapPin, X, Loader2, Upload, DollarSign, PlusCircle, Layers, Pencil, AlertTriangle, ExternalLink, ChevronLeft } from 'lucide-react';
import { useCaptain, CaptainFlow, CaptainMessage } from './CaptainContext';
import { SpeechBubble } from './SpeechBubble';
import { QuickReplies, FlowCard } from './QuickReplies';
import { StepIndicator, MobileStepIndicator } from './StepIndicator';
import { AdPreviewPanel } from './AdPreviewPanel';
import { LeadFormBuilder } from './LeadFormBuilder';
import { getCurrentNode } from '../lib/conversationFlow';
import { useAccount } from '@/context/AccountContext';
import { mutationsService, GeoLocation, InterestTarget, CustomAudience } from '@/services/mutations.service';
import { TooltipIcon } from '@/components/common/TooltipIcon';
import { getPersonalizedTooltip } from '@/utils/tooltipContent';
import { businessProfileService, BusinessProfile } from '@/services/business_profile.service';
import { AICopyModal } from '@/components/common/AICopyModal';

interface Campaign {
    id: string;
    name: string;
    status: string;
}

interface AdSet {
    id: string;
    name: string;
    status: string;
}

interface LeadForm {
    id: string;
    name: string;
}

interface PrereqWarning {
    type: 'pixel' | 'whatsapp' | 'form';
    message: string;
    link?: string;
    linkText?: string;
}

export const AICaptainChat: React.FC = () => {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;
    const t = useTranslations();
    const { state, dispatch } = useCaptain();
    const { selectedAccountId, linkedAccounts } = useAccount();
    const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);

    // Input states
    const [textInput, setTextInput] = useState('');
    const [locationSearch, setLocationSearch] = useState('');
    const [locationResults, setLocationResults] = useState<GeoLocation[]>([]);
    const [isSearchingLocations, setIsSearchingLocations] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [urlError, setUrlError] = useState<string | null>(null);

    // Age range state
    const [ageMin, setAgeMin] = useState(18);
    const [ageMax, setAgeMax] = useState(65);

    // Budget warning
    const [budgetWarning, setBudgetWarning] = useState(false);

    // Campaign/AdSet lists for selection
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [adSets, setAdSets] = useState<AdSet[]>([]);
    const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
    const [isLoadingAdSets, setIsLoadingAdSets] = useState(false);

    // Prerequisite warnings
    const [prereqWarning, setPrereqWarning] = useState<PrereqWarning | null>(null);
    const [isCheckingPrereqs, setIsCheckingPrereqs] = useState(false);

    // Lead forms
    const [leadForms, setLeadForms] = useState<LeadForm[]>([]);
    const [isLoadingForms, setIsLoadingForms] = useState(false);
    const [showFormBuilder, setShowFormBuilder] = useState(false);

    // Interest targeting
    const [interestSearch, setInterestSearch] = useState('');
    const [interestResults, setInterestResults] = useState<InterestTarget[]>([]);
    const [isSearchingInterests, setIsSearchingInterests] = useState(false);

    // Custom audiences
    const [availableAudiences, setAvailableAudiences] = useState<CustomAudience[]>([]);
    const [isLoadingAudiences, setIsLoadingAudiences] = useState(false);

    // Business profile for personalized tooltips
    const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

    // AI copy modal
    const [showAICopyModal, setShowAICopyModal] = useState(false);
    const [aiCopyFieldType, setAICopyFieldType] = useState<'headline' | 'body'>('headline');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const currentNode = getCurrentNode(state.flow, state.currentQuestionId);
    const isRTL = locale === 'he' || locale === 'ar';

    // Show preview panel after creative step
    const showPreview = ['creative', 'headline', 'body', 'link', 'cta', 'add_another_ad'].includes(state.currentQuestionId);

    // Load business profile on mount
    useEffect(() => {
        if (selectedAccountId) {
            businessProfileService.getBusinessProfile(selectedAccountId).then(setBusinessProfile);
        }
    }, [selectedAccountId]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [state.messages]);

    // Load campaigns when needed
    useEffect(() => {
        if ((currentNode?.inputType === 'campaign_select') && selectedAccount && campaigns.length === 0) {
            loadCampaigns();
        }
    }, [currentNode?.inputType, selectedAccount]);

    // Load ad sets when campaign selected
    useEffect(() => {
        if (currentNode?.inputType === 'adset_select' && state.selectedCampaignId) {
            loadAdSets();
        }
    }, [currentNode?.inputType, state.selectedCampaignId]);

    // Check prerequisites after objective is selected
    useEffect(() => {
        if (state.objective && selectedAccount) {
            checkPrerequisites();
        }
    }, [state.objective, state.leadType]);

    // Load lead forms when lead_type_select is shown
    useEffect(() => {
        if (currentNode?.inputType === 'lead_type_select' && selectedAccount?.page_id) {
            loadLeadForms();
        }
    }, [currentNode?.inputType, selectedAccount?.page_id]);

    // Pre-fill campaign name with suggested name when entering campaign_name step
    useEffect(() => {
        if (state.currentQuestionId === 'campaign_name' && state.campaignName && !textInput) {
            setTextInput(state.campaignName);
        }
    }, [state.currentQuestionId, state.campaignName]);

    // Auto-generate adset name when entering budget step
    useEffect(() => {
        if (state.currentQuestionId === 'budget' && !state.adsetName) {
            const parts: string[] = [];

            // Add location
            if (state.selectedLocations.length > 0) {
                const locationStr = state.selectedLocations.length <= 2
                    ? state.selectedLocations.map(l => l.name).join(', ')
                    : `${state.selectedLocations.length} locations`;
                parts.push(locationStr);
            }

            // Add targeting type
            if (state.targetingType) {
                parts.push(state.targetingType === 'advantage' ? 'Advantage+' : 'Custom');
            }

            // Add age/gender only for custom targeting
            if (state.targetingType === 'custom') {
                parts.push(`${state.ageMin}-${state.ageMax}`);
                if (state.gender !== 'all') {
                    parts.push(state.gender === 'male' ? 'M' : 'F');
                }
            }

            const suggestedAdsetName = parts.join(' | ');
            if (suggestedAdsetName) {
                dispatch({ type: 'SET_ADSET_NAME', name: suggestedAdsetName });
            }
        }
    }, [state.currentQuestionId, state.adsetName, state.selectedLocations, state.targetingType, state.ageMin, state.ageMax, state.gender]);

    // Location search
    useEffect(() => {
        if (locationSearch.length < 2) {
            setLocationResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingLocations(true);
            try {
                const results = await mutationsService.searchLocations(locationSearch, ['country', 'region', 'city'], locale);
                setLocationResults(results);
            } catch (e) {
                console.error('Location search failed:', e);
            } finally {
                setIsSearchingLocations(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [locationSearch, locale]);

    // Interest search
    useEffect(() => {
        if (interestSearch.length < 2) {
            setInterestResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingInterests(true);
            try {
                const results = await mutationsService.searchInterests(interestSearch);
                setInterestResults(results);
            } catch (e) {
                console.error('Interest search failed:', e);
            } finally {
                setIsSearchingInterests(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [interestSearch]);

    // Load custom audiences when audience_select is shown
    useEffect(() => {
        if (currentNode?.inputType === 'audience_select' && selectedAccount?.account_id && availableAudiences.length === 0) {
            loadAudiences();
        }
    }, [currentNode?.inputType, selectedAccount?.account_id]);

    const loadAudiences = async () => {
        if (!selectedAccount) return;
        setIsLoadingAudiences(true);
        try {
            const audiences = await mutationsService.getCustomAudiences(selectedAccount.account_id);
            setAvailableAudiences(audiences);
        } catch (e) {
            console.error('Failed to load audiences:', e);
        } finally {
            setIsLoadingAudiences(false);
        }
    };

    const checkPrerequisites = async () => {
        if (!selectedAccount) return;
        setIsCheckingPrereqs(true);
        setPrereqWarning(null);

        try {
            if (state.objective === 'SALES' || (state.objective === 'LEADS' && state.leadType === 'WEBSITE')) {
                // Check for pixel
                const pixels = await mutationsService.getPixels(selectedAccount.account_id);
                if (pixels.length === 0) {
                    setPrereqWarning({
                        type: 'pixel',
                        message: t('captain.warning_no_pixel'),
                        link: 'https://www.facebook.com/business/help/952192354843755',
                        linkText: t('captain.warning_no_pixel_link'),
                    });
                }
            } else if (state.objective === 'WHATSAPP') {
                // Check WhatsApp connection
                if (selectedAccount.page_id) {
                    const status = await mutationsService.checkWhatsAppStatus(selectedAccount.page_id);
                    if (!status.connected) {
                        setPrereqWarning({
                            type: 'whatsapp',
                            message: t('captain.warning_no_whatsapp'),
                            link: 'https://business.facebook.com/latest/settings/whatsapp_accounts',
                            linkText: t('captain.warning_no_whatsapp_link'),
                        });
                    }
                }
            } else if (state.objective === 'LEADS' && state.leadType === 'FORM') {
                // Check for lead forms
                if (selectedAccount.page_id) {
                    const forms = await mutationsService.getLeadForms(selectedAccount.page_id, selectedAccount.account_id);
                    setLeadForms(forms);
                    if (forms.length === 0) {
                        setPrereqWarning({
                            type: 'form',
                            message: t('captain.warning_no_forms'),
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Failed to check prerequisites:', e);
        } finally {
            setIsCheckingPrereqs(false);
        }
    };

    const loadLeadForms = async () => {
        if (!selectedAccount?.page_id) return;
        setIsLoadingForms(true);
        try {
            const forms = await mutationsService.getLeadForms(selectedAccount.page_id, selectedAccount.account_id);
            setLeadForms(forms);
        } catch (e) {
            console.error('Failed to load lead forms:', e);
        } finally {
            setIsLoadingForms(false);
        }
    };

    const loadCampaigns = async () => {
        if (!selectedAccount) return;
        setIsLoadingCampaigns(true);
        try {
            const result = await mutationsService.getCampaignsList(selectedAccount.account_id);
            setCampaigns(result);
        } catch (e) {
            console.error('Failed to load campaigns:', e);
        } finally {
            setIsLoadingCampaigns(false);
        }
    };

    const loadAdSets = async () => {
        if (!state.selectedCampaignId) return;
        setIsLoadingAdSets(true);
        try {
            const result = await mutationsService.getAdSetsList(state.selectedCampaignId);
            setAdSets(result);
        } catch (e) {
            console.error('Failed to load ad sets:', e);
        } finally {
            setIsLoadingAdSets(false);
        }
    };

    const addCaptainMessage = (content: string) => {
        const message: CaptainMessage = {
            id: crypto.randomUUID(),
            role: 'captain',
            content,
            timestamp: new Date(),
        };
        dispatch({ type: 'ADD_MESSAGE', message });
    };

    const addUserMessage = (content: string) => {
        const message: CaptainMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content,
            timestamp: new Date(),
        };
        dispatch({ type: 'ADD_MESSAGE', message });
    };

    const handleFlowSelect = (flow: CaptainFlow) => {
        dispatch({ type: 'SET_FLOW', flow });
        // Add welcome message
        const welcomeKey = flow === 'create' ? 'captain.welcome_create' :
            flow === 'add' ? 'captain.welcome_add' : 'captain.welcome_edit';
        addCaptainMessage(t(welcomeKey));
    };

    const handleGoBack = () => {
        if (state.questionHistory.length > 0) {
            dispatch({ type: 'GO_BACK' });
        }
    };

    const processAnswer = (answer: string, displayValue?: string) => {
        if (!currentNode) return;

        // Add user message
        addUserMessage(displayValue || answer);

        // Update state based on question
        const currentAd = state.ads[state.currentAdIndex];

        switch (state.currentQuestionId) {
            case 'welcome':
                if (state.flow === 'create') {
                    dispatch({ type: 'SET_OBJECTIVE', objective: answer as any });
                    // Auto-suggest campaign name based on objective and date
                    const today = new Date();
                    const dateStr = `${today.getDate()}.${today.getMonth() + 1}`;
                    const objectiveLabels: Record<string, string> = {
                        SALES: 'Sales',
                        LEADS: 'Leads',
                        TRAFFIC: 'Traffic',
                        ENGAGEMENT: 'Engagement',
                        WHATSAPP: 'WhatsApp',
                        CALLS: 'Calls',
                    };
                    const suggestedName = `${objectiveLabels[answer] || answer} - ${dateStr}`;
                    dispatch({ type: 'SET_CAMPAIGN_NAME', name: suggestedName });
                } else if (state.flow === 'edit') {
                    dispatch({ type: 'SET_EDIT_TYPE', editType: answer as any });
                }
                break;
            case 'lead_type':
                dispatch({ type: 'SET_LEAD_TYPE', leadType: answer as any });
                break;
            case 'campaign_name':
                dispatch({ type: 'SET_CAMPAIGN_NAME', name: answer });
                break;
            case 'targeting_type':
                dispatch({ type: 'SET_TARGETING_TYPE', targetingType: answer as any });
                break;
            case 'age':
            case 'edit_age':
                // Age is now set via age_range input, not here
                break;
            case 'gender':
                dispatch({ type: 'SET_GENDER', gender: answer as any });
                break;
            case 'platform':
                dispatch({ type: 'SET_PLATFORM', platform: answer as any });
                break;
            case 'ad_format':
                dispatch({ type: 'SET_AD_FORMAT', format: answer as any });
                break;
            case 'budget':
                dispatch({ type: 'SET_DAILY_BUDGET', budget: parseFloat(answer) });
                break;
            case 'headline':
            case 'edit_headline':
                dispatch({ type: 'UPDATE_CURRENT_AD', updates: { title: answer } });
                break;
            case 'body':
            case 'edit_body':
                dispatch({ type: 'UPDATE_CURRENT_AD', updates: { body: answer } });
                break;
            case 'link':
                dispatch({ type: 'UPDATE_CURRENT_AD', updates: { link: answer } });
                break;
            case 'cta':
                dispatch({ type: 'UPDATE_CURRENT_AD', updates: { cta: answer } });
                break;
            case 'add_another_ad':
                if (answer === 'same_creative' || answer === 'same_copy' || answer === 'scratch') {
                    dispatch({ type: 'ADD_NEW_AD', mode: answer });
                }
                break;
        }

        // Move to next question
        const nextNodeId = currentNode.nextNode(answer, state);
        if (nextNodeId === 'summary') {
            dispatch({ type: 'GO_TO_SUMMARY' });
        } else {
            dispatch({ type: 'SET_CURRENT_QUESTION', questionId: nextNodeId });
            // Add next question as captain message
            const nextNode = getCurrentNode(state.flow, nextNodeId);
            if (nextNode) {
                setTimeout(() => {
                    addCaptainMessage(t(nextNode.questionKey));
                }, 500);
            }
        }
    };

    const handleTextSubmit = () => {
        if (!textInput.trim()) return;

        // URL validation for link input
        if (state.currentQuestionId === 'link') {
            const trimmed = textInput.trim();
            try {
                const url = new URL(trimmed);
                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                    setUrlError(t('captain.url_invalid'));
                    return;
                }
            } catch {
                setUrlError(t('captain.url_invalid'));
                return;
            }
            setUrlError(null);
        }

        processAnswer(textInput.trim());
        setTextInput('');
    };

    const handleAgeConfirm = () => {
        if (ageMin >= ageMax) return;
        dispatch({ type: 'SET_AGE_RANGE', ageMin, ageMax });
        processAnswer(`${ageMin}-${ageMax}`, `${ageMin} - ${ageMax}`);
    };

    const handleLocationSelect = (loc: GeoLocation) => {
        const newLocations = [...state.selectedLocations, loc];
        dispatch({ type: 'SET_LOCATIONS', locations: newLocations });
        setLocationSearch('');
        setLocationResults([]);
    };

    const handleLocationRemove = (key: string) => {
        dispatch({
            type: 'SET_LOCATIONS',
            locations: state.selectedLocations.filter(l => l.key !== key)
        });
    };

    const handleLocationConfirm = () => {
        if (state.selectedLocations.length === 0) return;
        const locationNames = state.selectedLocations.map(l => l.name).join(', ');
        processAnswer('locations_set', locationNames);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setFilePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Update ad state
        dispatch({
            type: 'UPDATE_CURRENT_AD',
            updates: { file, previewUrl: URL.createObjectURL(file) }
        });
    };

    const handleFileConfirm = () => {
        if (!selectedFile) return;
        processAnswer('file_uploaded', selectedFile.name);
        setSelectedFile(null);
        setFilePreview(null);
    };

    const handleCampaignSelect = (campaignId: string, campaignName: string) => {
        dispatch({ type: 'SET_SELECTED_CAMPAIGN', campaignId, campaignName });
        processAnswer(campaignId, campaignName);
    };

    const handleAdSetSelect = (adSetId: string, adSetName: string) => {
        dispatch({ type: 'SET_SELECTED_ADSET', adSetId, adSetName });
        processAnswer(adSetId, adSetName);
    };

    const handleLeadTypeSelect = (value: string) => {
        dispatch({ type: 'SET_LEAD_TYPE', leadType: value as any });
        processAnswer(value, value === 'WEBSITE' ? t('captain.lead_type_website_title') : t('captain.lead_type_form_title'));
    };

    const handleFormCreated = (formId: string) => {
        // Update state with form ID
        dispatch({ type: 'UPDATE_CURRENT_AD', updates: { leadFormId: formId } });
        setPrereqWarning(null);
        loadLeadForms();
    };

    const handleBudgetChange = (value: string) => {
        setTextInput(value);
        const num = parseFloat(value);
        setBudgetWarning(!isNaN(num) && num > 0 && num < 5);
    };

    const handleOpenAICopy = (fieldType: 'headline' | 'body') => {
        setAICopyFieldType(fieldType);
        setShowAICopyModal(true);
    };

    const handleSelectAICopy = (variant: any) => {
        if (aiCopyFieldType === 'headline') {
            setTextInput(variant.headline);
        } else {
            setTextInput(variant.primary_text);
        }
    };

    // Render flow selection screen
    if (state.phase === 'flow_select') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#1a1a2e] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
                {/* Header */}
                <div className="p-4">
                    <button
                        onClick={() => router.push(`/${locale}/uploader`)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                        {t('captain.back_to_manual')}
                    </button>
                </div>

                {/* Captain Avatar */}
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="text-8xl mb-6 animate-bounce">
                        🤖
                    </div>

                    <SpeechBubble className="mb-8">
                        <p className="text-center font-medium">
                            {t('captain.welcome_choose_flow')}
                        </p>
                    </SpeechBubble>

                    {/* Flow options */}
                    <div className="w-full max-w-xl space-y-4">
                        <FlowCard
                            title={t('uploader.create_campaign_title')}
                            description={t('uploader.create_when')}
                            icon={<PlusCircle className="w-6 h-6" />}
                            color="blue"
                            onClick={() => handleFlowSelect('create')}
                        />
                        <FlowCard
                            title={t('uploader.add_creative_title')}
                            description={t('uploader.add_when')}
                            icon={<Layers className="w-6 h-6" />}
                            color="purple"
                            onClick={() => handleFlowSelect('add')}
                        />
                        <FlowCard
                            title={t('uploader.edit_title')}
                            description={t('uploader.edit_when')}
                            icon={<Pencil className="w-6 h-6" />}
                            color="orange"
                            onClick={() => handleFlowSelect('edit')}
                        />

                        {/* Build manually link */}
                        <div className="text-center pt-4 mt-4 border-t border-gray-800">
                            <button
                                onClick={() => router.push(`/${locale}/uploader/wizard`)}
                                className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
                            >
                                {t('uploader.build_manually')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Render conversation screen
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#1a1a2e] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-gray-800">
                <div className="flex items-center gap-3">
                    {state.questionHistory.length > 0 && (
                        <button
                            onClick={handleGoBack}
                            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                    <button
                        onClick={() => dispatch({ type: 'RESET' })}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                        {t('common.back')}
                    </button>
                </div>
                <div className="flex items-center gap-4">
                    {/* Mobile step indicator */}
                    <div className="md:hidden">
                        <MobileStepIndicator />
                    </div>
                    <span className="text-amber-500 font-bold">{t('captain.title')}</span>
                </div>
                <button
                    onClick={() => router.push(`/${locale}/uploader/wizard`)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                    {t('captain.switch_to_manual')}
                </button>
            </div>

            {/* Main content with sidebars */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left sidebar - Step indicator (desktop only) */}
                <div className="hidden md:block w-56 border-r border-gray-800 p-4 overflow-y-auto">
                    <StepIndicator />
                </div>

                {/* Center - Chat area */}
                <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
                    {/* Captain Avatar */}
                    <div className="text-7xl mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>
                        🤖
                    </div>

                    {/* Prerequisite warning */}
                    {prereqWarning && (
                        <div className="w-full max-w-lg mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-amber-300 text-sm">{prereqWarning.message}</p>
                                    {prereqWarning.link && (
                                        <a
                                            href={prereqWarning.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm mt-2"
                                        >
                                            {prereqWarning.linkText}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                    {prereqWarning.type === 'form' && (
                                        <button
                                            onClick={() => setShowFormBuilder(true)}
                                            className="mt-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            {t('captain.create_form')}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setPrereqWarning(null)}
                                        className="block mt-2 text-gray-400 hover:text-white text-sm"
                                    >
                                        {t('captain.warning_continue_anyway')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Current question */}
                    {currentNode && !isCheckingPrereqs && (
                        <SpeechBubble className="mb-6">
                            <div className="flex items-center justify-center gap-2">
                                <p className="text-center">
                                    {t(currentNode.questionKey)}
                                </p>
                                {/* Add contextual tooltips */}
                                {currentNode.inputType === 'budget' && (
                                    <TooltipIcon content={getPersonalizedTooltip('budget', businessProfile?.business_type)} />
                                )}
                                {currentNode.id === 'welcome' && state.flow === 'create' && (
                                    <TooltipIcon content={getPersonalizedTooltip('objective', businessProfile?.business_type)} />
                                )}
                                {currentNode.id === 'targeting_type' && (
                                    <TooltipIcon content={getPersonalizedTooltip('targeting', businessProfile?.business_type)} />
                                )}
                            </div>
                        </SpeechBubble>
                    )}

                    {isCheckingPrereqs && (
                        <div className="flex items-center gap-2 text-gray-400 mb-6">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t('captain.thinking')}
                        </div>
                    )}

                    {/* Input area based on type */}
                    <div className="w-full max-w-lg">
                        {/* Quick replies (for objectives with descriptions) */}
                        {currentNode?.inputType === 'quick_reply' && currentNode.options && (
                            <div className="space-y-2">
                                {currentNode.options.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => processAnswer(option.value, option.label)}
                                        className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-amber-500 text-left transition-colors flex items-center gap-3"
                                    >
                                        {option.icon && <span className="text-2xl">{option.icon}</span>}
                                        <div className="flex-1">
                                            <span className="text-white font-medium">{option.label}</span>
                                            {option.description && (
                                                <p className="text-gray-400 text-sm mt-1">{t(option.description)}</p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Lead type select with explanations */}
                        {currentNode?.inputType === 'lead_type_select' && (
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleLeadTypeSelect('WEBSITE')}
                                    className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-amber-500 text-left transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl">🔗</span>
                                        <span className="text-white font-medium">{t('captain.lead_type_website_title')}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm">{t('captain.lead_type_website_desc')}</p>
                                </button>
                                <button
                                    onClick={() => handleLeadTypeSelect('FORM')}
                                    className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-amber-500 text-left transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl">📝</span>
                                        <span className="text-white font-medium">{t('captain.lead_type_form_title')}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm">{t('captain.lead_type_form_desc')}</p>
                                </button>
                            </div>
                        )}

                        {/* Targeting type select */}
                        {currentNode?.inputType === 'targeting_type_select' && (
                            <div className="space-y-3">
                                <button
                                    onClick={() => processAnswer('advantage', t('captain.targeting_advantage_title'))}
                                    className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-amber-500 text-left transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl">🚀</span>
                                        <span className="text-white font-medium">{t('captain.targeting_advantage_title')}</span>
                                        <TooltipIcon content={getPersonalizedTooltip('advantage_plus', businessProfile?.business_type)} />
                                    </div>
                                    <p className="text-gray-400 text-sm">{t('captain.targeting_advantage_desc')}</p>
                                </button>
                                <button
                                    onClick={() => processAnswer('custom', t('captain.targeting_custom_title'))}
                                    className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-amber-500 text-left transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl">🎯</span>
                                        <span className="text-white font-medium">{t('captain.targeting_custom_title')}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm">{t('captain.targeting_custom_desc')}</p>
                                </button>
                            </div>
                        )}

                        {/* Custom audience select */}
                        {currentNode?.inputType === 'audience_select' && (
                            <div className="space-y-4">
                                {isLoadingAudiences ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Selected audiences */}
                                        {state.selectedAudiences.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {state.selectedAudiences.map(audId => {
                                                    const aud = availableAudiences.find(a => a.id === audId);
                                                    return aud ? (
                                                        <span key={audId} className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm flex items-center gap-2">
                                                            {aud.name}
                                                            <button onClick={() => dispatch({ type: 'SET_AUDIENCES', audiences: state.selectedAudiences.filter(id => id !== audId) })}>
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        )}

                                        {/* Available audiences */}
                                        {availableAudiences.length > 0 ? (
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {availableAudiences.map(aud => (
                                                    <button
                                                        key={aud.id}
                                                        onClick={() => {
                                                            const isSelected = state.selectedAudiences.includes(aud.id);
                                                            dispatch({
                                                                type: 'SET_AUDIENCES',
                                                                audiences: isSelected
                                                                    ? state.selectedAudiences.filter(id => id !== aud.id)
                                                                    : [...state.selectedAudiences, aud.id]
                                                            });
                                                        }}
                                                        className={`w-full p-3 rounded-lg text-left transition-colors flex items-center justify-between ${
                                                            state.selectedAudiences.includes(aud.id)
                                                                ? 'bg-amber-500/20 border border-amber-500'
                                                                : 'bg-gray-900 border border-gray-700 hover:border-amber-500'
                                                        }`}
                                                    >
                                                        <div>
                                                            <span className="text-white">{aud.name}</span>
                                                            {aud.approximate_count && (
                                                                <span className="text-gray-500 text-xs ml-2">
                                                                    ~{aud.approximate_count.toLocaleString()} people
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-gray-500">{aud.type_label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-400 text-sm text-center py-4">{t('captain.no_audiences')}</p>
                                        )}

                                        {/* Continue button */}
                                        <button
                                            onClick={() => processAnswer('continue', state.selectedAudiences.length > 0 ? `${state.selectedAudiences.length} audiences selected` : 'No audiences')}
                                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
                                        >
                                            {t('captain.continue')}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Interest search */}
                        {currentNode?.inputType === 'interest_search' && (
                            <div className="space-y-4">
                                {/* Search input */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="text"
                                        value={interestSearch}
                                        onChange={(e) => setInterestSearch(e.target.value)}
                                        placeholder={t('captain.search_interests')}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                    {isSearchingInterests && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-amber-500" />
                                    )}
                                </div>

                                {/* Selected interests */}
                                {state.selectedInterests.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {state.selectedInterests.map(interest => (
                                            <span key={interest.id} className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm flex items-center gap-2">
                                                {interest.name}
                                                <button onClick={() => dispatch({ type: 'REMOVE_INTEREST', interestId: interest.id })}>
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Search results */}
                                {interestResults.length > 0 && (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {interestResults
                                            .filter(i => !state.selectedInterests.some(s => s.id === i.id))
                                            .map(interest => (
                                                <button
                                                    key={interest.id}
                                                    onClick={() => {
                                                        dispatch({ type: 'ADD_INTEREST', interest });
                                                        setInterestSearch('');
                                                        setInterestResults([]);
                                                    }}
                                                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg hover:border-amber-500 text-left transition-colors"
                                                >
                                                    <span className="text-white">{interest.name}</span>
                                                    {interest.audience_size_lower_bound && interest.audience_size_upper_bound && (
                                                        <span className="text-gray-500 text-xs ml-2">
                                                            {(interest.audience_size_lower_bound / 1000000).toFixed(1)}M - {(interest.audience_size_upper_bound / 1000000).toFixed(1)}M
                                                        </span>
                                                    )}
                                                    {interest.path && (
                                                        <p className="text-gray-500 text-xs mt-1">{interest.path.join(' > ')}</p>
                                                    )}
                                                </button>
                                            ))}
                                    </div>
                                )}

                                {/* Continue button */}
                                <button
                                    onClick={() => processAnswer('continue', state.selectedInterests.length > 0 ? `${state.selectedInterests.length} interests selected` : 'No interests')}
                                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
                                >
                                    {t('captain.continue')}
                                </button>
                            </div>
                        )}

                        {/* Ad format select */}
                        {currentNode?.inputType === 'ad_format_select' && (
                            <div className="space-y-3">
                                <button
                                    onClick={() => processAnswer('single', t('captain.ad_format_single_title'))}
                                    className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-amber-500 text-left transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl">🖼️</span>
                                        <span className="text-white font-medium">{t('captain.ad_format_single_title')}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm">{t('captain.ad_format_single_desc')}</p>
                                </button>
                                <button
                                    onClick={() => processAnswer('carousel', t('captain.ad_format_carousel_title'))}
                                    className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-amber-500 text-left transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl">🎠</span>
                                        <span className="text-white font-medium">{t('captain.ad_format_carousel_title')}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm">{t('captain.ad_format_carousel_desc')}</p>
                                </button>
                            </div>
                        )}

                        {/* Age range dual dropdowns */}
                        {currentNode?.inputType === 'age_range' && (
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm text-gray-400 mb-2">{t('captain.age_min')}</label>
                                        <select
                                            value={ageMin}
                                            onChange={(e) => setAgeMin(parseInt(e.target.value))}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        >
                                            {Array.from({ length: 47 }, (_, i) => 18 + i).map(age => (
                                                <option key={age} value={age}>{age}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm text-gray-400 mb-2">{t('captain.age_max')}</label>
                                        <select
                                            value={ageMax}
                                            onChange={(e) => setAgeMax(parseInt(e.target.value))}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        >
                                            {Array.from({ length: 47 }, (_, i) => 19 + i).map(age => (
                                                <option key={age} value={age}>{age === 65 ? '65+' : age}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {ageMin >= ageMax && (
                                    <p className="text-red-400 text-sm text-center">Minimum age must be less than maximum age</p>
                                )}
                                <button
                                    onClick={handleAgeConfirm}
                                    disabled={ageMin >= ageMax}
                                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 text-white font-medium rounded-xl transition-colors"
                                >
                                    {t('captain.confirm_age')}
                                </button>
                            </div>
                        )}

                        {/* Add another ad options */}
                        {currentNode?.inputType === 'add_another_ad' && (
                            <div className="space-y-2">
                                <button
                                    onClick={() => processAnswer('same_creative', t('captain.add_another_same_creative'))}
                                    className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-amber-500 text-left transition-colors flex items-center gap-3"
                                >
                                    <span className="text-2xl">📝</span>
                                    <span className="text-white">{t('captain.add_another_same_creative')}</span>
                                </button>
                                <button
                                    onClick={() => processAnswer('same_copy', t('captain.add_another_same_copy'))}
                                    className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-amber-500 text-left transition-colors flex items-center gap-3"
                                >
                                    <span className="text-2xl">🖼️</span>
                                    <span className="text-white">{t('captain.add_another_same_copy')}</span>
                                </button>
                                <button
                                    onClick={() => processAnswer('scratch', t('captain.add_another_scratch'))}
                                    className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-amber-500 text-left transition-colors flex items-center gap-3"
                                >
                                    <span className="text-2xl">✨</span>
                                    <span className="text-white">{t('captain.add_another_scratch')}</span>
                                </button>
                                <button
                                    onClick={() => processAnswer('done', t('captain.add_another_done'))}
                                    className="w-full p-4 bg-green-600 hover:bg-green-700 rounded-xl text-left transition-colors flex items-center gap-3"
                                >
                                    <span className="text-2xl">✅</span>
                                    <span className="text-white font-medium">{t('captain.add_another_done')}</span>
                                </button>
                            </div>
                        )}

                        {/* Text input */}
                        {currentNode?.inputType === 'text' && (
                            <div className="space-y-2">
                                {/* AI copy button for headline and body */}
                                {(state.currentQuestionId === 'headline' || state.currentQuestionId === 'body') && (
                                    <button
                                        onClick={() => handleOpenAICopy(state.currentQuestionId as 'headline' | 'body')}
                                        className="w-full py-2 text-amber-400 hover:text-amber-300 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {t('write_for_me')}
                                    </button>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={textInput}
                                        onChange={(e) => {
                                            setTextInput(e.target.value);
                                            setUrlError(null);
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                                        placeholder={currentNode.placeholder ? t(currentNode.placeholder) : ''}
                                        className={`flex-1 bg-gray-900 border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none ${urlError ? 'border-red-500' : 'border-gray-700'}`}
                                    />
                                    <button
                                        onClick={handleTextSubmit}
                                        disabled={!textInput.trim()}
                                        className="p-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 rounded-xl transition-colors"
                                    >
                                        <Send className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                                {urlError && (
                                    <p className="text-red-400 text-sm">{urlError}</p>
                                )}
                            </div>
                        )}

                        {/* Budget input */}
                        {currentNode?.inputType === 'budget' && (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            type="number"
                                            min="5"
                                            value={textInput}
                                            onChange={(e) => handleBudgetChange(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !budgetWarning && handleTextSubmit()}
                                            placeholder="20"
                                            className={`w-full bg-gray-900 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none ${budgetWarning ? 'border-red-500' : 'border-gray-700'}`}
                                        />
                                    </div>
                                    <button
                                        onClick={handleTextSubmit}
                                        disabled={!textInput || parseFloat(textInput) < 5}
                                        className="p-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 rounded-xl transition-colors"
                                    >
                                        <Send className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                                {budgetWarning && (
                                    <p className="text-red-400 text-sm text-center">
                                        {t('captain.budget_minimum_warning')}
                                    </p>
                                )}
                                <p className="text-sm text-gray-400 text-center">
                                    {t('captain.budget_recommendation')}
                                </p>
                            </div>
                        )}

                        {/* Location search */}
                        {currentNode?.inputType === 'location_search' && (
                            <div className="space-y-4">
                                {/* Selected locations */}
                                {state.selectedLocations.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {state.selectedLocations.map((loc) => (
                                            <span
                                                key={loc.key}
                                                className="flex items-center gap-1 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm"
                                            >
                                                <MapPin className="w-3 h-3" />
                                                {loc.name}
                                                <button
                                                    onClick={() => handleLocationRemove(loc.key)}
                                                    className="ml-1 hover:text-white"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Search input */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="text"
                                        value={locationSearch}
                                        onChange={(e) => setLocationSearch(e.target.value)}
                                        placeholder={t('captain.search_location')}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                    {isSearchingLocations && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 animate-spin" />
                                    )}
                                </div>

                                {/* Search results */}
                                {locationResults.length > 0 && (
                                    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                                        {locationResults.slice(0, 5).map((loc) => (
                                            <button
                                                key={loc.key}
                                                onClick={() => handleLocationSelect(loc)}
                                                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-800 text-left transition-colors"
                                            >
                                                <MapPin className="w-4 h-4 text-gray-500" />
                                                <span className="text-white">{loc.name}</span>
                                                <span className="text-gray-500 text-sm capitalize">({loc.type})</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Confirm button */}
                                {state.selectedLocations.length > 0 && (
                                    <button
                                        onClick={handleLocationConfirm}
                                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
                                    >
                                        {t('captain.confirm_locations')} ({state.selectedLocations.length})
                                    </button>
                                )}
                            </div>
                        )}

                        {/* File upload */}
                        {currentNode?.inputType === 'file_upload' && (
                            <div className="space-y-4">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {filePreview ? (
                                    <div className="space-y-4">
                                        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900">
                                            {selectedFile?.type.startsWith('video/') ? (
                                                <video src={filePreview} className="w-full h-full object-contain" controls />
                                            ) : (
                                                <img src={filePreview} alt="Preview" className="w-full h-full object-contain" />
                                            )}
                                            <button
                                                onClick={() => { setSelectedFile(null); setFilePreview(null); }}
                                                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70"
                                            >
                                                <X className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleFileConfirm}
                                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
                                        >
                                            {t('captain.use_this_creative')}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-12 border-2 border-dashed border-gray-700 rounded-xl hover:border-amber-500 transition-colors flex flex-col items-center gap-3"
                                    >
                                        <Upload className="w-10 h-10 text-gray-500" />
                                        <span className="text-gray-400">{t('captain.click_to_upload')}</span>
                                        <span className="text-gray-600 text-sm">{t('captain.supported_formats')}</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Campaign selection */}
                        {currentNode?.inputType === 'campaign_select' && (
                            <div className="space-y-2">
                                {isLoadingCampaigns ? (
                                    <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {t('common.loading')}
                                    </div>
                                ) : campaigns.length === 0 ? (
                                    <p className="text-center text-yellow-400 py-4">
                                        {t('uploader.no_campaigns_found')}
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {campaigns.map((campaign) => (
                                            <button
                                                key={campaign.id}
                                                onClick={() => handleCampaignSelect(campaign.id, campaign.name)}
                                                className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-amber-500 text-left transition-colors"
                                            >
                                                <span className="text-white font-medium">{campaign.name}</span>
                                                <span className={`ml-2 text-xs px-2 py-0.5 rounded ${campaign.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                                    {campaign.status}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* AdSet selection */}
                        {currentNode?.inputType === 'adset_select' && (
                            <div className="space-y-2">
                                {isLoadingAdSets ? (
                                    <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {t('common.loading')}
                                    </div>
                                ) : adSets.length === 0 ? (
                                    <p className="text-center text-yellow-400 py-4">
                                        {t('uploader.no_adsets_found')}
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {adSets.map((adSet) => (
                                            <button
                                                key={adSet.id}
                                                onClick={() => handleAdSetSelect(adSet.id, adSet.name)}
                                                className="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl hover:border-amber-500 text-left transition-colors"
                                            >
                                                <span className="text-white font-medium">{adSet.name}</span>
                                                <span className={`ml-2 text-xs px-2 py-0.5 rounded ${adSet.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                                    {adSet.status}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div ref={messagesEndRef} />
                </div>

                {/* Right sidebar - Ad Preview (desktop only, after creative step) */}
                {showPreview && (
                    <div className="hidden lg:block w-80 border-l border-gray-800 p-4 overflow-y-auto">
                        <AdPreviewPanel />
                    </div>
                )}
            </div>

            {/* Lead Form Builder Modal */}
            {selectedAccount?.page_id && (
                <LeadFormBuilder
                    isOpen={showFormBuilder}
                    onClose={() => setShowFormBuilder(false)}
                    onFormCreated={handleFormCreated}
                    pageId={selectedAccount.page_id}
                    accountId={selectedAccount.account_id}
                />
            )}

            {/* AI Copy Modal */}
            {selectedAccount && state.objective && (
                <AICopyModal
                    isOpen={showAICopyModal}
                    onClose={() => setShowAICopyModal(false)}
                    onSelect={handleSelectAICopy}
                    accountId={selectedAccount.account_id}
                    objective={state.objective}
                    fieldType={aiCopyFieldType}
                />
            )}

            {/* CSS for float animation */}
            <style jsx global>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </div>
    );
};
