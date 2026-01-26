"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Send, Search, MapPin, X, Loader2, Upload, DollarSign, PlusCircle, Layers, Pencil } from 'lucide-react';
import { useCaptain, CaptainFlow, CaptainMessage } from './CaptainContext';
import { SpeechBubble, TypingIndicator } from './SpeechBubble';
import { QuickReplies, FlowCard } from './QuickReplies';
import { getCurrentNode, parseAgeRange } from '../lib/conversationFlow';
import { useAccount } from '@/context/AccountContext';
import { mutationsService, GeoLocation } from '@/services/mutations.service';

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

    // Campaign/AdSet lists for selection
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [adSets, setAdSets] = useState<AdSet[]>([]);
    const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
    const [isLoadingAdSets, setIsLoadingAdSets] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const currentNode = getCurrentNode(state.flow, state.currentQuestionId);
    const isRTL = locale === 'he' || locale === 'ar';

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

    const processAnswer = (answer: string, displayValue?: string) => {
        if (!currentNode) return;

        // Add user message
        addUserMessage(displayValue || answer);

        // Update state based on question
        switch (state.currentQuestionId) {
            case 'welcome':
                if (state.flow === 'create') {
                    dispatch({ type: 'SET_OBJECTIVE', objective: answer as any });
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
            case 'age':
            case 'edit_age':
                const { ageMin, ageMax } = parseAgeRange(answer);
                dispatch({ type: 'SET_AGE_RANGE', ageMin, ageMax });
                break;
            case 'gender':
                dispatch({ type: 'SET_GENDER', gender: answer as any });
                break;
            case 'platform':
                dispatch({ type: 'SET_PLATFORM', platform: answer as any });
                break;
            case 'budget':
                dispatch({ type: 'SET_DAILY_BUDGET', budget: parseFloat(answer) });
                break;
            case 'headline':
            case 'edit_headline':
                dispatch({ type: 'UPDATE_AD', id: state.ads[0].id, updates: { title: answer } });
                break;
            case 'body':
            case 'edit_body':
                dispatch({ type: 'UPDATE_AD', id: state.ads[0].id, updates: { body: answer } });
                break;
            case 'link':
                dispatch({ type: 'UPDATE_AD', id: state.ads[0].id, updates: { link: answer } });
                break;
            case 'cta':
                dispatch({ type: 'UPDATE_AD', id: state.ads[0].id, updates: { cta: answer } });
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
        processAnswer(textInput.trim());
        setTextInput('');
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
            type: 'UPDATE_AD',
            id: state.ads[0].id,
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
                        🏴‍☠️
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
                <button
                    onClick={() => dispatch({ type: 'RESET' })}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                    {t('common.back')}
                </button>
                <span className="text-amber-500 font-bold">{t('captain.title')}</span>
                <button
                    onClick={() => router.push(`/${locale}/uploader/wizard`)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                    {t('captain.switch_to_manual')}
                </button>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
                {/* Captain Avatar */}
                <div className="text-7xl mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>
                    🏴‍☠️
                </div>

                {/* Current question */}
                {currentNode && (
                    <SpeechBubble className="mb-6">
                        <p className="text-center">
                            {t(currentNode.questionKey)}
                        </p>
                    </SpeechBubble>
                )}

                {/* Input area based on type */}
                <div className="w-full max-w-lg">
                    {/* Quick replies */}
                    {currentNode?.inputType === 'quick_reply' && currentNode.options && (
                        <QuickReplies
                            options={currentNode.options}
                            onSelect={(value) => {
                                const option = currentNode.options?.find(o => o.value === value);
                                processAnswer(value, option?.label);
                            }}
                        />
                    )}

                    {/* Text input */}
                    {currentNode?.inputType === 'text' && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                                placeholder={currentNode.placeholder ? t(currentNode.placeholder) : ''}
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                            <button
                                onClick={handleTextSubmit}
                                disabled={!textInput.trim()}
                                className="p-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 rounded-xl transition-colors"
                            >
                                <Send className="w-5 h-5 text-white" />
                            </button>
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
                                        onChange={(e) => setTextInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                                        placeholder="20"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none"
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
                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${campaign.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                                }`}>
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
                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${adSet.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {adSet.status}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Message history (collapsed) */}
                {state.messages.length > 0 && (
                    <div className="w-full max-w-lg mt-8">
                        <details className="group">
                            <summary className="flex items-center justify-center gap-2 text-gray-500 text-sm cursor-pointer hover:text-gray-300">
                                {t('captain.show_history')} ({state.messages.length})
                            </summary>
                            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                                {state.messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`p-3 rounded-lg ${msg.role === 'captain'
                                                ? 'bg-gray-800 text-gray-300'
                                                : 'bg-amber-500/20 text-amber-300 ml-8'
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </details>
                    </div>
                )}
            </div>

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
