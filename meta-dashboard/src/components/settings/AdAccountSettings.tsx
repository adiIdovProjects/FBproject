"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
    Settings,
    Target,
    Globe,
    TrendingUp,
    Users,
    X
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

type TabType = 'overview' | 'optimization' | 'sharing';

interface AccountQuizData {
    account_id: string;
    primary_goal: string;
    primary_conversions: string[];
    industry: string;
    optimization_priority: string;
    quiz_completed: boolean;
}

interface AdAccountInfo {
    account_id: string;
    name: string;
    currency: string;
}

interface Collaborator {
    user_id: number;
    full_name: string | null;
    email: string;
    permission_level: string;
}

interface AdAccountSettingsProps {
    accountId: string;
}

export const AdAccountSettings: React.FC<AdAccountSettingsProps> = ({ accountId }) => {
    const t = useTranslations();
    const searchParams = useSearchParams();

    // Initialize tab from URL or default to 'overview'
    const tabParam = searchParams.get('tab') as TabType;
    const initialTab = (tabParam && ['overview', 'optimization', 'sharing'].includes(tabParam)) ? tabParam : 'overview';

    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [quizData, setQuizData] = useState<AccountQuizData | null>(null);
    const [accountInfo, setAccountInfo] = useState<AdAccountInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Sharing state
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [shareEmail, setShareEmail] = useState('');
    const [sharePermission, setSharePermission] = useState<'admin' | 'viewer'>('viewer');
    const [shareError, setShareError] = useState<string | null>(null);
    const [shareSuccess, setShareSuccess] = useState(false);

    // Load account quiz data and account info on mount
    useEffect(() => {
        loadAccountData();
    }, [accountId]);

    // Load collaborators when sharing tab is active
    useEffect(() => {
        if (activeTab === 'sharing') {
            loadCollaborators();
        }
    }, [activeTab, accountId]);

    const loadAccountData = async () => {
        setIsLoading(true);
        try {
            // Load quiz data
            const quizResponse = await apiClient.get<{quiz_completed: boolean, data: AccountQuizData | null}>(`/api/v1/accounts/${accountId}/quiz`);
            if (quizResponse.data.quiz_completed && quizResponse.data.data) {
                setQuizData({
                    ...quizResponse.data.data,
                    quiz_completed: true
                });
            } else {
                setQuizData({
                    account_id: accountId,
                    primary_goal: '',
                    primary_conversions: [],
                    industry: '',
                    optimization_priority: '',
                    quiz_completed: false
                });
            }

            // Load account info from linked accounts
            const accountsResponse = await apiClient.get<AdAccountInfo[]>('/api/v1/users/me/accounts');
            const account = accountsResponse.data.find(acc => acc.account_id === accountId);
            if (account) {
                setAccountInfo(account);
            }
        } catch (error) {
            console.error('Failed to load account data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Update URL when tab changes
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('tab', tab);
        window.history.pushState({}, '', newUrl.toString());
    };

    // Load collaborators
    const loadCollaborators = async () => {
        try {
            const response = await apiClient.get<Collaborator[]>(`/api/v1/accounts/${accountId}/collaborators`);
            setCollaborators(response.data);
        } catch (error) {
            console.error('Failed to load collaborators:', error);
        }
    };

    // Share account handler
    const handleShare = async () => {
        setShareError(null);
        setShareSuccess(false);

        try {
            await apiClient.post(`/api/v1/accounts/${accountId}/share`, {
                email: shareEmail,
                permission_level: sharePermission
            });
            setShareEmail('');
            setShareSuccess(true);
            await loadCollaborators();

            // Clear success message after 3 seconds
            setTimeout(() => setShareSuccess(false), 3000);
        } catch (error: any) {
            setShareError(error.response?.data?.detail || t('common.error_occurred'));
        }
    };

    // Unshare account handler
    const handleUnshare = async (userId: number) => {
        if (!confirm(t('settings.confirm_remove_member'))) return;

        try {
            await apiClient.delete(`/api/v1/accounts/${accountId}/share/${userId}`);
            await loadCollaborators();
        } catch (error: any) {
            setShareError(error.response?.data?.detail || t('common.error_occurred'));
        }
    };

    const tabs = [
        { id: 'overview', label: t('settings.overview'), icon: Globe },
        { id: 'optimization', label: t('settings.optimization'), icon: Target },
        { id: 'sharing', label: t('settings.sharing'), icon: Users },
    ];

    // Format goal text for display
    const formatGoal = (goal: string) => {
        return goal.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                </div>
            );
        }

        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-2">{t('settings.account_information')}</h3>
                            <p className="text-sm text-gray-400 mb-6">
                                {t('settings.account_info_desc')}
                            </p>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                            {t('settings.account_name')}
                                        </label>
                                        <input
                                            type="text"
                                            value={accountInfo?.name || 'N/A'}
                                            disabled
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                            {t('settings.account_id')}
                                        </label>
                                        <input
                                            type="text"
                                            value={accountId}
                                            disabled
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed font-mono text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                        {t('settings.currency')}
                                    </label>
                                    <input
                                        type="text"
                                        value={accountInfo?.currency || 'N/A'}
                                        disabled
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/10">
                                <p className="text-xs text-gray-500">
                                    {t('settings.facebook_readonly')}
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'optimization':
                // Show "Complete Setup" button if quiz not completed
                if (!quizData || !quizData.quiz_completed) {
                    return (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <div className="text-center py-8">
                                    <Target className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-white mb-2">
                                        {t('settings.quiz_not_completed')}
                                    </h3>
                                    <p className="text-sm text-gray-400 mb-6">
                                        {t('settings.complete_setup_first')}
                                    </p>
                                    <a
                                        href={`/en/account-quiz?account_id=${accountId}`}
                                        className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-bold py-3 px-6 rounded-xl transition-all"
                                    >
                                        <TrendingUp className="w-4 h-4" />
                                        {t('settings.complete_setup')}
                                    </a>
                                </div>
                            </div>
                        </div>
                    );
                }

                // Show filled data only if quiz is completed
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-2">{t('settings.optimization_preferences')}</h3>
                            <p className="text-sm text-gray-400 mb-6">
                                {t('settings.optimization_preferences_desc')}
                            </p>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                        {t('quiz.primary_goal')}
                                    </label>
                                    <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                                        {formatGoal(quizData.primary_goal)}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                        {t('quiz.conversion_types')}
                                    </label>
                                    <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                                        <div className="flex flex-wrap gap-2">
                                            {quizData.primary_conversions.map((conversion) => (
                                                <span
                                                    key={conversion}
                                                    className="px-3 py-1 bg-accent/20 text-accent rounded-lg text-sm font-bold"
                                                >
                                                    {formatGoal(conversion)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                            {t('quiz.industry')}
                                        </label>
                                        <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                                            {formatGoal(quizData.industry)}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                            {t('quiz.optimization_priority')}
                                        </label>
                                        <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                                            {formatGoal(quizData.optimization_priority)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/10">
                                <p className="text-xs text-gray-500">
                                    {t('settings.optimization_readonly')}
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'sharing':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Share Account Form */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-2">{t('settings.share_account')}</h3>
                            <p className="text-sm text-gray-400 mb-6">
                                Add collaborators by entering their email address
                            </p>

                            <div className="flex flex-col md:flex-row gap-3">
                                <input
                                    type="email"
                                    placeholder={t('settings.enter_email')}
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                                <select
                                    value={sharePermission}
                                    onChange={(e) => setSharePermission(e.target.value as 'admin' | 'viewer')}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                                >
                                    <option value="viewer">{t('settings.viewer')}</option>
                                    <option value="admin">{t('settings.admin')}</option>
                                </select>
                                <button
                                    onClick={handleShare}
                                    disabled={!shareEmail}
                                    className="bg-accent hover:bg-accent/90 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition-all"
                                >
                                    {t('settings.share')}
                                </button>
                            </div>

                            {shareError && (
                                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                                    {shareError}
                                </div>
                            )}

                            {shareSuccess && (
                                <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-400 text-sm">
                                    {t('settings.shared_successfully')}
                                </div>
                            )}
                        </div>

                        {/* People with Access */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">{t('settings.people_with_access')}</h3>

                            <div className="space-y-3">
                                {collaborators.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center py-8">
                                        No collaborators yet. Share this account to get started.
                                    </p>
                                ) : (
                                    collaborators.map(collab => (
                                        <div
                                            key={collab.user_id}
                                            className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                                        >
                                            <div className="flex-1">
                                                <p className="font-bold text-white">
                                                    {collab.full_name || collab.email}
                                                </p>
                                                <p className="text-sm text-gray-400">{collab.email}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm px-3 py-1 bg-accent/20 text-accent rounded-lg font-bold">
                                                    {collab.permission_level}
                                                </span>
                                                <button
                                                    onClick={() => handleUnshare(collab.user_id)}
                                                    className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
                                                    title="Remove access"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
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
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                                isActive
                                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
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
            {renderContent()}
        </div>
    );
};
