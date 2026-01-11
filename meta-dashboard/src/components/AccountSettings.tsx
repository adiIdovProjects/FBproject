"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    User,
    CreditCard,
    Users,
    Shield,
    Save,
    CheckCircle2,
    Crown,
    Settings,
    Target,
    Globe,
    Trash2,
    RefreshCw,
    Plus,
    ExternalLink,
    ShieldAlert
} from 'lucide-react';
import { fetchActionTypes, toggleActionConversion, fetchFunnel, saveFunnel, ActionType, FunnelStep } from '@/services/actions.service';
import { unlinkAccount } from '@/services/accounts.service'; // Import unlink service

import { useAccount } from '@/context/AccountContext'; // Import context
import { apiClient } from '@/services/apiClient'; // Import API client
import LanguageSwitcher from '@/components/LanguageSwitcher';

type TabType = 'profile' | 'billing' | 'team' | 'security' | 'integrations' | 'conversions' | 'accounts';

export const AccountSettings: React.FC = () => {
    const t = useTranslations();
    const router = useRouter(); // Initialize router if needed for programmatic navigation
    const searchParams = useSearchParams();
    const { linkedAccounts, refreshAccounts, isLoading: isAccountsLoading } = useAccount(); // Use context

    // Initialize tab from URL or default to 'profile'
    const tabParam = searchParams.get('tab') as TabType;
    const initialTab = (tabParam && ['profile', 'accounts', 'billing', 'team', 'security', 'integrations', 'conversions'].includes(tabParam)) ? tabParam : 'profile';

    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedAccountForDeletion, setSelectedAccountForDeletion] = useState<string | null>(null);
    const [deleteDataChecked, setDeleteDataChecked] = useState(false);

    const openDeleteModal = (accountId: string) => {
        setSelectedAccountForDeletion(accountId);
        setDeleteDataChecked(false); // Reset checkbox
        setShowDeleteModal(true);
    };

    const confirmUnlink = async () => {
        if (!selectedAccountForDeletion) return;

        try {
            await unlinkAccount(selectedAccountForDeletion, deleteDataChecked);
            // Refresh accounts
            await refreshAccounts();
            setShowDeleteModal(false);
            setSelectedAccountForDeletion(null);
        } catch (error) {
            console.error('Failed to unlink account:', error);
            alert(t('common.error_occurred'));
        }
    };


    // Handle connection success/error params
    useEffect(() => {
        if (searchParams.get('connect_success') === 'true') {
            // Refresh accounts list to show the new one
            refreshAccounts();
            // Clear the param
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('connect_success');
            window.history.replaceState({}, '', newUrl.toString());
            // Optional: Success toast here
        }
        if (searchParams.get('error')) {
            alert(searchParams.get('error'));
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('error');
            window.history.replaceState({}, '', newUrl.toString());
        }
    }, [searchParams, refreshAccounts]);

    // Update URL when tab changes
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('tab', tab);
        window.history.pushState({}, '', newUrl.toString());
    };

    const tabs = [
        { id: 'profile', label: t('settings.profile'), icon: User },
        { id: 'accounts', label: t('settings.accounts'), icon: Globe }, // New Accounts Tab
        { id: 'billing', label: t('settings.billing'), icon: CreditCard },
        { id: 'team', label: t('settings.team'), icon: Users },
        { id: 'security', label: t('settings.security'), icon: Shield },
        { id: 'conversions', label: t('settings.conversions'), icon: Target },
        { id: 'integrations', label: t('settings.integrations'), icon: Settings },
    ];

    const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
    const [isLoadingActions, setIsLoadingActions] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'active'>('all');
    const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([]);
    const [isSavingFunnel, setIsSavingFunnel] = useState(false);

    React.useEffect(() => {
        if (activeTab === 'conversions') {
            loadActionTypes();
            loadFunnel();
        }
    }, [activeTab]);

    const loadActionTypes = async () => {
        setIsLoadingActions(true);
        try {
            const data = await fetchActionTypes();
            setActionTypes(data);
        } catch (error) {
            console.error('Failed to load action types:', error);
        } finally {
            setIsLoadingActions(false);
        }
    };

    const loadFunnel = async () => {
        try {
            const steps = await fetchFunnel();
            setFunnelSteps(steps);
        } catch (error) {
            console.error('Failed to load funnel:', error);
        }
    };

    const filteredActions = actionTypes.filter(action => {
        const matchesSearch = action.action_type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === 'all' ? true : action.is_conversion;
        return matchesSearch && matchesFilter;
    });

    // Funnel Handlers
    const addFunnelStep = () => {
        setFunnelSteps([...funnelSteps, { step_order: funnelSteps.length + 1, action_type: '' }]);
    };

    const updateFunnelStep = (index: number, actionType: string) => {
        const newSteps = [...funnelSteps];
        newSteps[index].action_type = actionType;
        setFunnelSteps(newSteps);
    };

    const removeFunnelStep = (index: number) => {
        const newSteps = funnelSteps.filter((_, i) => i !== index).map((step, i) => ({
            ...step,
            step_order: i + 1
        }));
        setFunnelSteps(newSteps);
    };

    const moveFunnelStep = (index: number, direction: number) => {
        if (index + direction < 0 || index + direction >= funnelSteps.length) return;

        const newSteps = [...funnelSteps];
        const temp = newSteps[index];
        newSteps[index] = newSteps[index + direction];
        newSteps[index + direction] = temp;

        // Re-index
        const reindexed = newSteps.map((step, i) => ({ ...step, step_order: i + 1 }));
        setFunnelSteps(reindexed);
    };

    const handleSaveFunnel = async () => {
        setIsSavingFunnel(true);
        try {
            // Filter out empty steps
            const validSteps = funnelSteps.filter(s => s.action_type);
            await saveFunnel(validSteps);
            // alert('Funnel saved successfully!'); // Use toast if available
        } catch (error) {
            console.error('Failed to save funnel:', error);
            alert('Failed to save funnel');
        } finally {
            setIsSavingFunnel(false);
        }
    };



    const handleUnlink = async (accountId: string) => {
        if (confirm(t('settings.confirm_unlink'))) {
            try {
                await unlinkAccount(accountId);
                // Refresh accounts
                await refreshAccounts();
            } catch (error) {
                console.error('Failed to unlink account:', error);
            }
        }
    };

    const handleConnectFacebook = async () => {
        try {
            const response = await apiClient.get<{ url: string }>('/api/v1/auth/facebook/connect');
            if (response.data.url) {
                window.location.href = response.data.url;
            }
        } catch (error) {
            console.error('Failed to initiate Facebook connection:', error);
            alert(t('common.error_occurred'));
        }
    };

    const handleToggleConversion = async (actionType: string) => {
        const currentAction = actionTypes.find(a => a.action_type === actionType);
        if (!currentAction) return;

        const targetState = !currentAction.is_conversion;

        try {
            await toggleActionConversion(actionType, targetState);
            // Optimistic update
            setActionTypes(prev => prev.map(a =>
                a.action_type === actionType ? { ...a, is_conversion: targetState } : a
            ));
        } catch (error) {
            console.error('Failed to toggle conversion:', error);
            // Revert on error
            loadActionTypes();
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'accounts':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-2">{t('settings.connected_accounts')}</h3>
                            <p className="text-sm text-gray-400 mb-6">
                                {t('settings.connected_accounts_desc')}
                            </p>

                            {isAccountsLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {linkedAccounts.length > 0 ? (
                                        linkedAccounts.map((account) => (
                                            <div key={account.account_id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-[#1877F2]/20 flex items-center justify-center text-[#1877F2]">
                                                        <Globe className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{account.name}</p>
                                                        <p className="text-xs text-gray-500">ID: {account.account_id} • {account.currency}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => openDeleteModal(account.account_id)}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    {t('settings.remove')}
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            {t('settings.no_accounts')}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-white/10">
                                <button
                                    onClick={handleConnectFacebook}
                                    className="flex items-center gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    {t('settings.add_account')}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'profile':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('settings.personal_info')}</label>
                                <input
                                    type="text"
                                    placeholder={t('settings.full_name')}
                                    defaultValue="Alex Morgen"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent/50 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('settings.email_address')}</label>
                                <input
                                    type="email"
                                    placeholder={t('settings.email_address')}
                                    defaultValue="alex@example.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent/50 transition-all"
                                />
                            </div>
                        </div>
                        <div className="pt-6 border-t border-white/10 space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('settings.language')}</label>
                                <div className="w-fit">
                                    <LanguageSwitcher />
                                </div>
                            </div>
                        </div>

                        <button className="flex items-center gap-2 bg-accent hover:bg-accent-light text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-accent/20">
                            <Save className="w-4 h-4" />
                            {t('common.save_changes')}
                        </button>
                    </div>
                );
            case 'billing':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-gradient-to-br from-accent/20 to-purple-500/10 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <Crown className="w-12 h-12 text-accent/20" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-black text-white mb-1">{t('settings.current_plan')}</h3>
                                <p className="text-accent font-bold text-sm uppercase tracking-widest mb-4">Pro Plan - $49/mo</p>
                                <button className="bg-white text-black font-black py-2 px-6 rounded-lg text-sm hover:bg-gray-200 transition-all">
                                    {t('settings.upgrade_plan')}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('settings.payment_method')}</h4>
                            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div className="w-12 h-8 bg-gray-800 rounded border border-white/5 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-white">VISA</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white">•••• •••• •••• 4242</p>
                                    <p className="text-[10px] text-gray-500">Expires 12/26</p>
                                </div>
                                <button className="text-xs font-bold text-accent hover:underline">Edit</button>
                            </div>
                        </div>
                    </div>
                );
            case 'team':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">{t('settings.manage_team')}</h3>
                            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded-xl transition-all text-sm border border-white/10">
                                <Plus className="w-4 h-4" />
                                {t('settings.invite_member')}
                            </button>
                        </div>
                        <div className="space-y-2">
                            {[
                                { name: 'Alex Morgen', email: 'alex@example.com', role: 'Owner', status: 'Active' },
                                { name: 'Sarah Wilson', email: 'sarah@example.com', role: 'Admin', status: 'Active' },
                                { name: 'Mike Ross', email: 'mike@example.com', role: 'Editor', status: 'Pending' },
                            ].map((member) => (
                                <div key={member.email} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                                        {member.name[0]}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-white">{member.name}</p>
                                        <p className="text-xs text-gray-500">{member.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-white">{member.role}</p>
                                        <p className={`text-[10px] font-bold uppercase ${member.status === 'Active' ? 'text-green-500' : 'text-yellow-500'}`}>{member.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div>
                                    <p className="text-sm font-bold text-white">{t('settings.two_factor')}</p>
                                    <p className="text-xs text-gray-500">{t('settings.two_factor_desc')}</p>
                                </div>
                                <div className="w-12 h-6 bg-accent rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div>
                                    <p className="text-sm font-bold text-white">{t('settings.change_password')}</p>
                                    <p className="text-xs text-gray-500">{t('settings.change_password_desc')} 3 months ago.</p>
                                </div>
                                <button className="text-xs font-bold text-accent hover:underline">{t('settings.update')}</button>
                            </div>
                        </div>
                    </div>
                );
            case 'integrations':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#1877F2]/10 rounded-xl flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-[#1877F2]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white">Facebook Ads</p>
                                    <p className="text-[10px] text-green-500 font-bold uppercase">{t('settings.connected')}</p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 opacity-50">
                                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                                    <Plus className="w-6 h-6 text-gray-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white">Google Ads</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">{t('settings.not_connected')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'conversions':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Conversion Toggles Section */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-2">{t('settings.conversion_settings')}</h3>
                            <p className="text-sm text-gray-400 mb-6">
                                {t('settings.conversion_settings_description')}
                            </p>

                            {/* Search and Filter */}
                            <div className="flex flex-col md:flex-row gap-4 mb-6">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={t('settings.search_actions') || "Search actions..."}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-accent/50 transition-all text-sm"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFilterType('all')}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterType === 'all' ? 'bg-white/10 text-white border border-white/20' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setFilterType('active')}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterType === 'active' ? 'bg-accent/20 text-accent border border-accent/20' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Active
                                    </button>
                                </div>
                            </div>

                            {isLoadingActions ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {filteredActions.map((action) => (
                                        <div
                                            key={action.action_type}
                                            onClick={() => handleToggleConversion(action.action_type)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${action.is_conversion
                                                ? 'bg-accent/10 border-accent/30 text-white'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                                }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold capitalize">
                                                    {t.has(action.action_type) ? t(action.action_type) : action.action_type.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-[10px] uppercase tracking-wider opacity-50">
                                                    {action.is_conversion ? t('settings.tracking_as_conversion') : t('settings.ignored')}
                                                </span>
                                            </div>
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${action.is_conversion
                                                ? 'bg-accent border-accent text-white'
                                                : 'border-white/20 group-hover:border-white/40'
                                                }`}>
                                                {action.is_conversion && <CheckCircle2 className="w-3 h-3" />}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredActions.length === 0 && (
                                        <div className="col-span-2 text-center py-8 text-gray-500 text-sm">
                                            No actions found matching "{searchTerm}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Funnel Builder Section */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2">Marketing Funnel</h3>
                                    <p className="text-sm text-gray-400">
                                        Define the steps of your customer journey. You can include any action, even if it's not tracked as a primary conversion.
                                    </p>
                                </div>
                                <button
                                    onClick={handleSaveFunnel}
                                    disabled={isSavingFunnel}
                                    className="flex items-center gap-2 bg-accent hover:bg-accent-light text-white font-bold py-2 px-4 rounded-xl transition-all shadow-lg shadow-accent/20 disabled:opacity-50 text-sm"
                                >
                                    {isSavingFunnel ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save className="w-4 h-4" />}
                                    Save Funnel
                                </button>
                            </div>

                            <div className="space-y-4">
                                {funnelSteps.map((step, index) => (
                                    <div key={index} className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-gray-400">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <select
                                                value={step.action_type}
                                                onChange={(e) => updateFunnelStep(index, e.target.value)}
                                                className="w-full bg-[#1C1F26] border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent text-sm capitalize"
                                            >
                                                <option value="" disabled>Select an action...</option>
                                                {/* Show ALL action types, sorted alphabetically */}
                                                {[...actionTypes].sort((a, b) => a.action_type.localeCompare(b.action_type)).map(action => (
                                                    <option key={action.action_type} value={action.action_type}>
                                                        {t.has(action.action_type) ? t(action.action_type) : action.action_type.replace(/_/g, ' ')}
                                                        {!action.is_conversion && " (Not a Conversion)"}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => moveFunnelStep(index, -1)}
                                                disabled={index === 0}
                                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                onClick={() => moveFunnelStep(index, 1)}
                                                disabled={index === funnelSteps.length - 1}
                                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                ↓
                                            </button>
                                            <button
                                                onClick={() => removeFunnelStep(index)}
                                                className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={addFunnelStep}
                                    className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all text-sm font-bold flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Funnel Step
                                </button>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Tabs */}
            <div className="lg:col-span-1 space-y-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id as TabType)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-accent/15 text-accent border border-accent/20 shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'group-hover:text-white'}`} />
                            <span className="text-sm font-bold">{tab.label}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3">
                <div className="bg-sidebar/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-white tracking-tight">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h2>
                        <p className="text-gray-500 text-sm font-medium mt-1">
                            {t('settings.manage_settings_desc')}
                        </p>
                    </div>
                    {renderContent()}
                </div>
            </div>
            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#1C1F26] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 text-red-500 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{t('settings.confirm_unlink')}</h3>
                                <p className="text-sm text-gray-400">{t('settings.unlink_warning')}</p>
                            </div>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 mb-6">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="mt-1 relative">
                                    <input
                                        type="checkbox"
                                        checked={deleteDataChecked}
                                        onChange={(e) => setDeleteDataChecked(e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-600 bg-black/20 text-red-500 focus:ring-red-500 cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <span className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                                        {t('settings.delete_data_checkbox')}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {t('settings.delete_data_desc')}
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={confirmUnlink}
                                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/20"
                            >
                                {deleteDataChecked ? t('common.delete_permanently') : t('common.unlink_only')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
