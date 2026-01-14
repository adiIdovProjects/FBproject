"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    User,
    CreditCard,
    Shield,
    Save,
    Crown,
    Globe,
    Trash2,
    RefreshCw,
    Plus,
    ShieldAlert,
    CheckCircle,
    Users
} from 'lucide-react';
import { unlinkAccount } from '@/services/accounts.service';

import { useAccount } from '@/context/AccountContext'; // Import context
import { apiClient } from '@/services/apiClient'; // Import API client
import LanguageSwitcher from '@/components/LanguageSwitcher';

type TabType = 'profile' | 'billing' | 'security' | 'accounts';

export const AccountSettings: React.FC = () => {
    const t = useTranslations();
    const router = useRouter(); // Initialize router if needed for programmatic navigation
    const searchParams = useSearchParams();
    const { linkedAccounts, refreshAccounts, isLoading: isAccountsLoading } = useAccount(); // Use context

    // Initialize tab from URL or default to 'profile'
    const tabParam = searchParams.get('tab') as TabType;
    const initialTab = (tabParam && ['profile', 'accounts', 'billing', 'security'].includes(tabParam)) ? tabParam : 'profile';

    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedAccountForDeletion, setSelectedAccountForDeletion] = useState<string | null>(null);
    const [deleteDataChecked, setDeleteDataChecked] = useState(false);

    // User Profile State
    const [userProfile, setUserProfile] = useState<{
        email: string;
        full_name: string;
        job_title: string;
        years_experience: string;
    }>({
        email: '',
        full_name: '',
        job_title: '',
        years_experience: ''
    });
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

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
        if (searchParams.get('reconnect_success') === 'true') {
            // Refresh accounts list after reconnect
            refreshAccounts();
            // Clear the param
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('reconnect_success');
            window.history.replaceState({}, '', newUrl.toString());
            // Show success message
            alert(t('settings.reconnect_success'));
        }
        if (searchParams.get('error')) {
            alert(searchParams.get('error'));
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('error');
            window.history.replaceState({}, '', newUrl.toString());
        }
    }, [searchParams, refreshAccounts]);

    // Load user profile
    useEffect(() => {
        const loadUserProfile = async () => {
            try {
                const profileResponse = await apiClient.get<any>('/api/v1/users/me');
                setUserProfile({
                    email: profileResponse.data.email || '',
                    full_name: profileResponse.data.full_name || '',
                    job_title: profileResponse.data.job_title || '',
                    years_experience: profileResponse.data.years_experience || ''
                });
            } catch (e) {
                console.error("User profile fetch error", e);
            }
        };

        loadUserProfile();
    }, []);

    // Update URL when tab changes
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('tab', tab);
        window.history.pushState({}, '', newUrl.toString());
    };

    // Save user profile
    const handleSaveProfile = async () => {
        setIsSavingProfile(true);
        setProfileSaveSuccess(false);
        try {
            await apiClient.patch('/api/v1/users/me/profile', {
                full_name: userProfile.full_name,
                job_title: userProfile.job_title,
                years_experience: userProfile.years_experience,
                referral_source: '' // Not editing this field in settings
            });

            setProfileSaveSuccess(true);
            setTimeout(() => setProfileSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to save profile:', error);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const tabs = [
        { id: 'profile', label: t('settings.profile'), icon: User },
        { id: 'accounts', label: t('settings.accounts'), icon: Globe },
        { id: 'billing', label: t('settings.billing'), icon: CreditCard },
        { id: 'security', label: t('settings.security'), icon: Shield },
    ];



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
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="w-10 h-10 rounded-full bg-[#1877F2]/20 flex items-center justify-center text-[#1877F2]">
                                                        <Globe className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{account.name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            ID: {account.account_id} • {account.currency}
                                                            {account.page_id && <span className="ml-2 text-green-500">✓ {t('accounts.page_connected')}</span>}
                                                            {!account.page_id && <span className="ml-2 text-yellow-500">⚠ {t('settings.no_page')}</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!account.page_id && (
                                                        <button
                                                            onClick={handleConnectFacebook}
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 text-xs font-bold transition-all"
                                                            title="Reconnect to fetch Page ID"
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                            {t('settings.reconnect')}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => openDeleteModal(account.account_id)}
                                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        {t('settings.remove')}
                                                    </button>
                                                </div>
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
                        {/* Personal Info Section */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Users className="w-5 h-5 text-accent" />
                                    {t('settings.personal_information')}
                                </h3>
                                {profileSaveSuccess && (
                                    <span className="text-green-400 text-sm font-bold animate-in fade-in flex items-center gap-1">
                                        <CheckCircle className="w-4 h-4" />
                                        {t('settings.saved')}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Username (Full Name) */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                        {t('settings.username')}
                                    </label>
                                    <input
                                        type="text"
                                        value={userProfile.full_name}
                                        onChange={(e) => setUserProfile({ ...userProfile, full_name: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                                        placeholder={t('settings.enter_name_placeholder')}
                                    />
                                </div>

                                {/* Email (Read-only) */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                        {t('settings.email_address')}
                                    </label>
                                    <input
                                        type="email"
                                        value={userProfile.email}
                                        disabled
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed"
                                        placeholder={t('settings.email_placeholder')}
                                    />
                                </div>

                                {/* Job Title */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                        {t('settings.job_title')}
                                    </label>
                                    <input
                                        type="text"
                                        value={userProfile.job_title}
                                        onChange={(e) => setUserProfile({ ...userProfile, job_title: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                                        placeholder={t('settings.job_title_placeholder')}
                                    />
                                </div>

                                {/* Years of Experience */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                        {t('settings.years_experience')}
                                    </label>
                                    <input
                                        type="text"
                                        value={userProfile.years_experience}
                                        onChange={(e) => setUserProfile({ ...userProfile, years_experience: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                                        placeholder={t('settings.experience_placeholder')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Language Section */}
                        <div className="pt-6 border-t border-white/10 space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('settings.language')}</label>
                                <div className="w-fit">
                                    <LanguageSwitcher />
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSaveProfile}
                            disabled={isSavingProfile}
                            className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-3 px-6 rounded-xl transition-all"
                        >
                            {isSavingProfile ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
                                <p className="text-accent font-bold text-sm uppercase tracking-widest mb-4">{t('settings.pro_plan')}</p>
                                <button className="bg-white text-black font-black py-2 px-6 rounded-lg text-sm hover:bg-gray-200 transition-all">
                                    {t('settings.upgrade_plan')}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('settings.payment_method')}</h4>
                            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div className="w-12 h-8 bg-gray-800 rounded border border-white/5 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-white">{t('settings.visa')}</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white">•••• •••• •••• 4242</p>
                                    <p className="text-[10px] text-gray-500">{t('settings.expires')} 12/26</p>
                                </div>
                                <button className="text-xs font-bold text-accent hover:underline">{t('settings.edit')}</button>
                            </div>
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
                                    <p className="text-xs text-gray-500">{t('settings.last_changed')} 3 months ago.</p>
                                </div>
                                <button className="text-xs font-bold text-accent hover:underline">{t('settings.update')}</button>
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
