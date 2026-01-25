"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
    Settings,
    Target,
    Globe,
    TrendingUp,
    Users,
    X,
    CheckCircle,
    AlertCircle,
    Facebook,
    Monitor,
    MousePointer2,
    Briefcase,
    Building2,
    ArrowUpRight,
    Edit2,
    Save,
    RefreshCw,
    Loader2
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

// Option constants (same as account-quiz page)
const PRIMARY_GOALS = [
    { value: 'purchases', label: 'Purchases / Sales' },
    { value: 'leads', label: 'Leads / Sign-ups' },
    { value: 'brand_awareness', label: 'Brand Awareness' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'book_meeting', label: 'Book a Meeting / Appointments' },
    { value: 'other', label: 'Other' }
];

const INDUSTRIES = [
    { value: 'ecommerce', label: 'E-commerce' },
    { value: 'saas', label: 'SaaS / Software' },
    { value: 'local_business', label: 'Local Business' },
    { value: 'b2b', label: 'B2B Services' },
    { value: 'agency', label: 'Marketing Agency' },
    { value: 'other', label: 'Other' }
];

const OPTIMIZATION_PRIORITIES = [
    { value: 'scaling', label: 'Scaling campaigns' },
    { value: 'reduce_costs', label: 'Reducing costs' },
    { value: 'improve_creative', label: 'Improving creative performance' },
    { value: 'better_targeting', label: 'Better targeting' },
    { value: 'increase_conversions', label: 'Increasing conversion rate' },
    { value: 'other', label: 'Other' }
];

type TabType = 'overview' | 'optimization';

interface AccountQuizData {
    account_id: string;
    primary_goal: string;
    primary_conversions: string[];
    industry: string;
    optimization_priority: string;
    business_description?: string;
    quiz_completed: boolean;
}

interface AdAccountInfo {
    account_id: string;
    name: string;
    currency: string;
    page_id?: string;
    page_name?: string;
}

interface PixelInfo {
    id: string;
    name: string;
}


interface AdAccountSettingsProps {
    accountId: string;
}

export const AdAccountSettings: React.FC<AdAccountSettingsProps> = ({ accountId }) => {
    const t = useTranslations();
    const locale = useLocale();
    const searchParams = useSearchParams();

    // Initialize tab from URL or default to 'overview'
    const tabParam = searchParams.get('tab') as TabType;
    const initialTab = (tabParam && ['overview', 'optimization', 'sharing'].includes(tabParam)) ? tabParam : 'overview';

    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [quizData, setQuizData] = useState<AccountQuizData | null>(null);
    const [accountInfo, setAccountInfo] = useState<AdAccountInfo | null>(null);
    const [pixelInfo, setPixelInfo] = useState<PixelInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Business Description State
    const [businessDescription, setBusinessDescription] = useState('');
    const [isSavingDescription, setIsSavingDescription] = useState(false);
    const [descriptionSaveSuccess, setDescriptionSaveSuccess] = useState(false);

    // Reconnect Page State
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [reconnectSuccess, setReconnectSuccess] = useState(false);

    // Edit Mode State for Optimization
    const [isEditingOptimization, setIsEditingOptimization] = useState(false);
    const [editedGoal, setEditedGoal] = useState('');
    const [editedIndustry, setEditedIndustry] = useState('');
    const [editedPriority, setEditedPriority] = useState('');
    const [editedConversions, setEditedConversions] = useState<string[]>([]);
    const [availableConversions, setAvailableConversions] = useState<string[]>([]);

    // Load account data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // 1. Load Quiz Data
                try {
                    const quizResponse = await apiClient.get<{ quiz_completed: boolean, data: AccountQuizData | null }>(`/api/v1/accounts/${accountId}/quiz`);
                    if (quizResponse.data.data) {
                        setQuizData({
                            ...quizResponse.data.data,
                            quiz_completed: quizResponse.data.quiz_completed
                        });
                        setBusinessDescription(quizResponse.data.data.business_description || '');
                    } else {
                        // Fallback if no data
                        setQuizData({
                            account_id: accountId,
                            primary_goal: '',
                            primary_conversions: [],
                            industry: '',
                            optimization_priority: '',
                            business_description: '',
                            quiz_completed: false
                        });
                    }
                } catch (e) {
                    console.error("Quiz data fetch error", e);
                }

                // 2. Load Account Info
                // We fetch ALL accounts for the user and find the current one to get the name/currency
                const accountsResponse = await apiClient.get<AdAccountInfo[]>('/api/v1/users/me/accounts');
                // Ensure type safety and finding the correct account (string vs number handling)
                const account = accountsResponse.data.find(acc => String(acc.account_id) === String(accountId));

                if (account) {
                    setAccountInfo(account);
                } else {
                    // Fallback: try to fetch specific account details if individual endpoint existed (not in this case based on previous context),
                    // or just set minimal info if not found in list (shouldn't happen if access control works)
                    console.warn(`Account ${accountId} not found in user's account list.`);
                }

                // 3. Load Pixel Info
                try {
                    const pixelsResponse = await apiClient.get<PixelInfo[]>('/api/mutations/pixels', {
                        params: { account_id: accountId }
                    });
                    if (pixelsResponse.data && pixelsResponse.data.length > 0) {
                        setPixelInfo(pixelsResponse.data[0]); // Use first pixel
                    }
                } catch (e) {
                    console.error("Pixel fetch error", e);
                }

            } catch (error) {
                console.error('Failed to load account settings data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (accountId && accountId !== 'undefined' && accountId !== 'null') {
            loadData();
        }
    }, [accountId]);




    // Handle reconnect Facebook page
    const handleReconnectPage = async () => {
        setIsReconnecting(true);
        setReconnectSuccess(false);
        try {
            await apiClient.post('/api/v1/auth/facebook/reconnect');

            // Refresh account info to get updated page_id
            const accountsResponse = await apiClient.get<AdAccountInfo[]>('/api/v1/users/me/accounts');
            const account = accountsResponse.data.find(acc => String(acc.account_id) === String(accountId));
            if (account) {
                setAccountInfo(account);
            }

            setReconnectSuccess(true);
            setTimeout(() => setReconnectSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to reconnect Facebook page:', error);
        } finally {
            setIsReconnecting(false);
        }
    };

    // Update URL when tab changes
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('tab', tab);
        window.history.pushState({}, '', newUrl.toString());
    };

    // Start editing optimization preferences
    const startEditingOptimization = async () => {
        if (!quizData) return;
        setEditedGoal(quizData.primary_goal || '');
        setEditedIndustry(quizData.industry || '');
        setEditedPriority(quizData.optimization_priority || '');
        setEditedConversions(quizData.primary_conversions || []);

        // Fetch available conversions
        try {
            const response = await apiClient.get<{ conversion_types: string[] }>(`/api/v1/accounts/${accountId}/conversion-types`);
            setAvailableConversions(response.data.conversion_types || []);
        } catch (e) {
            console.error('Failed to fetch conversion types:', e);
        }
        setIsEditingOptimization(true);
    };

    const cancelEditingOptimization = () => {
        setIsEditingOptimization(false);
    };

    const toggleConversion = (conversion: string) => {
        setEditedConversions(prev =>
            prev.includes(conversion)
                ? prev.filter(c => c !== conversion)
                : [...prev, conversion]
        );
    };

    // Save business description and other optimization updates
    const handleSaveOptimization = async () => {
        if (!quizData) return;

        const goalToSave = isEditingOptimization ? editedGoal : quizData.primary_goal;
        const industryToSave = isEditingOptimization ? editedIndustry : quizData.industry;
        const priorityToSave = isEditingOptimization ? editedPriority : quizData.optimization_priority;
        const conversionsToSave = isEditingOptimization ? editedConversions : quizData.primary_conversions;

        setIsSavingDescription(true);
        setDescriptionSaveSuccess(false);
        try {
            await apiClient.post(`/api/v1/accounts/${accountId}/quiz`, {
                primary_goal: goalToSave,
                primary_goal_other: '',
                primary_conversions: conversionsToSave,
                industry: industryToSave,
                optimization_priority: priorityToSave,
                business_description: businessDescription
            });

            setDescriptionSaveSuccess(true);
            setIsEditingOptimization(false);

            setTimeout(() => setDescriptionSaveSuccess(false), 3000);

            // Update local state with all saved values
            setQuizData(prev => prev ? ({
                ...prev,
                primary_goal: goalToSave,
                industry: industryToSave,
                optimization_priority: priorityToSave,
                primary_conversions: conversionsToSave,
                business_description: businessDescription
            }) : null);

        } catch (error) {
            console.error('Failed to save optimization settings:', error);
        } finally {
            setIsSavingDescription(false);
        }
    };


    const tabs = [
        { id: 'overview', label: t('settings.overview'), icon: Globe },
        { id: 'optimization', label: t('settings.optimization'), icon: Target },
    ];

    const formatText = (text: string) => {
        if (!text) return 'Not set';
        return text.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const LoadingSpinner = () => (
        <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
    );

    const renderOverview = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Connected Assets Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-accent" />
                    {t('settings.connected_assets')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Ad Account Status */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-start justify-between group hover:bg-white/10 transition-colors">
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Ad Account</p>
                            <div className="flex items-center gap-2 text-white font-semibold">
                                <Facebook className="w-4 h-4 text-blue-500" />
                                {accountInfo?.name || 'Loading...'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 font-mono">{accountId}</p>
                        </div>
                        <div className="bg-green-500/10 p-1.5 rounded-full">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                    </div>

                    {/* Page Status */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-start justify-between group hover:bg-white/10 transition-colors">
                        <div className="flex-1">
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Facebook Page</p>
                            <div className="flex items-center gap-2 text-white font-semibold">
                                <Globe className="w-4 h-4 text-blue-400" />
                                {accountInfo?.page_name || (accountInfo?.page_id ? 'Connected' : 'Not Connected')}
                            </div>
                            {accountInfo?.page_id && <p className="text-xs text-gray-500 mt-1 font-mono">ID: {accountInfo.page_id}</p>}
                            {!accountInfo?.page_id && (
                                <button
                                    onClick={handleReconnectPage}
                                    disabled={isReconnecting}
                                    className="mt-2 flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-medium transition-colors disabled:opacity-50"
                                >
                                    {isReconnecting ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-3 h-3" />
                                    )}
                                    {isReconnecting ? t('common.loading') : t('accounts.reconnect_facebook')}
                                </button>
                            )}
                            {reconnectSuccess && (
                                <p className="mt-2 text-xs text-green-400 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    {t('settings.reconnect_success')}
                                </p>
                            )}
                        </div>
                        <div className={`p-1.5 rounded-full ${accountInfo?.page_id ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                            {accountInfo?.page_id ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-yellow-500" />
                            )}
                        </div>
                    </div>

                    {/* Pixel Status */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-start justify-between group hover:bg-white/10 transition-colors">
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{t('settings.pixel')}</p>
                            <div className="flex items-center gap-2 text-white font-semibold">
                                <MousePointer2 className="w-4 h-4 text-purple-500" />
                                {pixelInfo?.name || t('settings.no_pixel')}
                            </div>
                            {pixelInfo?.id && <p className="text-xs text-gray-500 mt-1 font-mono">ID: {pixelInfo.id}</p>}
                        </div>
                        <div className={`p-1.5 rounded-full ${pixelInfo ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                            {pixelInfo ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-yellow-500" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Account Settings Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-400" />
                        {t('settings.account_name')}
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                            {t('settings.account_name')}
                        </label>
                        <input
                            type="text"
                            value={accountInfo?.name || ''}
                            disabled
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-300 font-medium cursor-not-allowed"
                            placeholder="Checking..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                            {t('settings.currency')}
                        </label>
                        <input
                            type="text"
                            value={accountInfo?.currency || ''}
                            disabled
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-300 font-medium cursor-not-allowed"
                            placeholder="Checking..."
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-4 italic">
                    * {t('settings.facebook_readonly')}
                </p>
            </div>
        </div>
    );

    const renderOptimization = () => {
        // Show "Complete Setup" CTA if quiz completely missing
        if (!quizData?.quiz_completed && !quizData?.primary_goal) {
            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Target className="w-8 h-8 text-accent" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            {t('settings.quiz_not_completed')}
                        </h3>
                        <p className="text-gray-400 max-w-md mx-auto mb-8">
                            {t('settings.complete_setup_first')}
                        </p>
                        <a
                            href={`/${locale}/account-quiz?account_id=${accountId}`}
                            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-accent/20 hover:scale-105"
                        >
                            <TrendingUp className="w-4 h-4" />
                            {t('settings.complete_setup')}
                        </a>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">{t('settings.optimization_preferences')}</h3>
                            <p className="text-sm text-gray-400">{t('settings.manage_ai_understanding')}</p>
                        </div>

                        {!isEditingOptimization ? (
                            <button
                                onClick={startEditingOptimization}
                                className="text-sm text-accent font-bold hover:text-accent/80 transition-colors flex items-center gap-1"
                            >
                                <Edit2 className="w-4 h-4" />
                                {t('settings.edit_preferences')}
                            </button>
                        ) : (
                            <button
                                onClick={cancelEditingOptimization}
                                className="text-sm text-gray-400 font-bold hover:text-white transition-colors flex items-center gap-1"
                            >
                                <X className="w-4 h-4" />
                                {t('common.cancel')}
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Goal */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Target className="w-4 h-4 text-blue-400" />
                                </div>
                                <span className="text-sm font-bold text-gray-300 uppercase tracking-wide">{t('quiz.primary_goal')}</span>
                            </div>
                            {isEditingOptimization ? (
                                <select
                                    value={editedGoal}
                                    onChange={(e) => setEditedGoal(e.target.value)}
                                    className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-accent ml-11"
                                >
                                    <option value="">Select a goal</option>
                                    {PRIMARY_GOALS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-lg font-semibold text-white pl-11">
                                    {formatText(quizData?.primary_goal || '')}
                                </p>
                            )}
                        </div>

                        {/* Industry */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <Building2 className="w-4 h-4 text-purple-400" />
                                </div>
                                <span className="text-sm font-bold text-gray-300 uppercase tracking-wide">{t('quiz.industry')}</span>
                            </div>
                            {isEditingOptimization ? (
                                <select
                                    value={editedIndustry}
                                    onChange={(e) => setEditedIndustry(e.target.value)}
                                    className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-accent ml-11"
                                >
                                    <option value="">Select an industry</option>
                                    {INDUSTRIES.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-lg font-semibold text-white pl-11">
                                    {formatText(quizData?.industry || '')}
                                </p>
                            )}
                        </div>

                        {/* Priority */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                    <ArrowUpRight className="w-4 h-4 text-green-400" />
                                </div>
                                <span className="text-sm font-bold text-gray-300 uppercase tracking-wide">{t('quiz.optimization_priority')}</span>
                            </div>
                            {isEditingOptimization ? (
                                <select
                                    value={editedPriority}
                                    onChange={(e) => setEditedPriority(e.target.value)}
                                    className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-accent ml-11"
                                >
                                    <option value="">Select a priority</option>
                                    {OPTIMIZATION_PRIORITIES.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-lg font-semibold text-white pl-11">
                                    {formatText(quizData?.optimization_priority || '')}
                                </p>
                            )}
                        </div>

                        {/* Conversions */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-orange-500/20 rounded-lg">
                                    <MousePointer2 className="w-4 h-4 text-orange-400" />
                                </div>
                                <span className="text-sm font-bold text-gray-300 uppercase tracking-wide">{t('quiz.conversion_types')}</span>
                            </div>
                            {isEditingOptimization ? (
                                <div className="pl-11 flex flex-wrap gap-2">
                                    {availableConversions.length > 0 ? availableConversions.map((conv) => (
                                        <button
                                            key={conv}
                                            onClick={() => toggleConversion(conv)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                                editedConversions.includes(conv)
                                                    ? 'bg-accent text-white'
                                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                            }`}
                                        >
                                            {formatText(conv)}
                                        </button>
                                    )) : (
                                        <span className="text-gray-500 italic text-sm">No conversions available</span>
                                    )}
                                </div>
                            ) : (
                                <div className="pl-11 flex flex-wrap gap-2">
                                    {quizData?.primary_conversions.map((conv) => (
                                        <span key={conv} className="px-2.5 py-1 bg-white/10 rounded-md text-sm font-medium text-gray-200">
                                            {formatText(conv)}
                                        </span>
                                    ))}
                                    {(!quizData?.primary_conversions || quizData.primary_conversions.length === 0) && (
                                        <span className="text-gray-500 italic text-sm">None selected</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Save Preferences Button (shown when editing) */}
                    {isEditingOptimization && (
                        <div className="flex justify-end mb-6">
                            <button
                                onClick={handleSaveOptimization}
                                disabled={isSavingDescription}
                                className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-bold py-2 px-6 rounded-lg transition-all text-sm disabled:opacity-50"
                            >
                                {isSavingDescription ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {t('common.saving')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        {t('common.save_changes')}
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Business Description Section */}
                    <div className="pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-md font-bold text-white flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-gray-400" />
                                    {t('settings.tell_us_about_business')}
                                </h4>
                                <p className="text-sm text-gray-400 mt-1">
                                    {t('settings.provide_context_for_ai')}
                                </p>
                            </div>
                            {descriptionSaveSuccess && (
                                <span className="text-green-400 text-sm font-bold animate-in fade-in flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4" />
                                    {t('common.saved_successfully')}
                                </span>
                            )}
                        </div>

                        <div className="relative">
                            <textarea
                                value={businessDescription}
                                onChange={(e) => setBusinessDescription(e.target.value)}
                                placeholder={t('settings.business_description_placeholder')}
                                className="w-full h-32 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none placeholder-gray-600 leading-relaxed"
                            />
                            <div className="mt-3 flex justify-end">
                                <button
                                    onClick={handleSaveOptimization}
                                    disabled={isSavingDescription || businessDescription === quizData?.business_description} // Disable if no change
                                    className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-2 px-6 rounded-lg transition-all text-sm"
                                >
                                    {isSavingDescription ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            {t('common.saving')}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            {t('settings.save_context')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id as TabType)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${isActive
                                ? 'bg-white text-black shadow-lg shadow-white/5'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {isLoading ? <LoadingSpinner /> : (
                <div className="min-h-[400px]">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'optimization' && renderOptimization()}
                </div>
            )}
        </div>
    );
};
