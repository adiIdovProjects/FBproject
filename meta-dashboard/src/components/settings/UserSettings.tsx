"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
    User,
    CreditCard,
    Shield,
    Save,
    CheckCircle2
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type TabType = 'profile' | 'security' | 'billing';

interface UserProfile {
    id: number;
    email: string;
    full_name: string;
    job_title: string;
    years_experience: string;
}

export const UserSettings: React.FC = () => {
    const t = useTranslations();
    const searchParams = useSearchParams();

    // Initialize tab from URL or default to 'profile'
    const tabParam = searchParams.get('tab') as TabType;
    const initialTab = (tabParam && ['profile', 'security', 'billing'].includes(tabParam)) ? tabParam : 'profile';

    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Form state for Profile tab
    const [fullName, setFullName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [yearsExperience, setYearsExperience] = useState('');

    // Load user profile on mount
    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get<UserProfile>('/api/v1/users/me');
            setUserProfile(response.data);
            setFullName(response.data.full_name || '');
            setJobTitle(response.data.job_title || '');
            setYearsExperience(response.data.years_experience || '');
        } catch (error) {
            console.error('Failed to load user profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await apiClient.patch('/api/v1/users/me/profile', {
                full_name: fullName,
                job_title: jobTitle,
                years_experience: yearsExperience
            });
            setSaveSuccess(true);
            await loadUserProfile(); // Reload to get fresh data
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to save profile:', error);
            alert(t('common.error_occurred'));
        } finally {
            setIsSaving(false);
        }
    };

    // Update URL when tab changes
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('tab', tab);
        window.history.pushState({}, '', newUrl.toString());
    };

    const tabs = [
        { id: 'profile', label: t('settings.profile'), icon: User },
        { id: 'security', label: t('settings.security'), icon: Shield },
        { id: 'billing', label: t('settings.billing'), icon: CreditCard },
    ];

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                </div>
            );
        }

        switch (activeTab) {
            case 'profile':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                    {t('settings.full_name')}
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder={t('settings.full_name')}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent/50 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                    {t('settings.email_address')}
                                </label>
                                <input
                                    type="email"
                                    value={userProfile?.email || ''}
                                    disabled
                                    placeholder={t('settings.email_address')}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed"
                                    title={t('settings.email_readonly')}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                    {t('settings.job_title')}
                                </label>
                                <input
                                    type="text"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    placeholder={t('settings.job_title')}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent/50 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                    {t('settings.years_experience')}
                                </label>
                                <input
                                    type="text"
                                    value={yearsExperience}
                                    onChange={(e) => setYearsExperience(e.target.value)}
                                    placeholder={t('settings.years_experience')}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10 space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                    {t('settings.language')}
                                </label>
                                <div className="w-fit">
                                    <LanguageSwitcher />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10 flex items-center gap-4">
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        {t('common.saving')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        {t('common.save_changes')}
                                    </>
                                )}
                            </button>
                            {saveSuccess && (
                                <div className="flex items-center gap-2 text-green-400 animate-in fade-in slide-in-from-left-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="font-bold">{t('common.saved_successfully')}</span>
                                </div>
                            )}
                        </div>

                    </div>
                );

            case 'security':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-2">{t('settings.security_settings')}</h3>
                            <p className="text-sm text-gray-400 mb-6">
                                {t('settings.security_desc')}
                            </p>
                            <div className="text-center py-8 text-gray-500">
                                {t('settings.coming_soon')}
                            </div>
                        </div>
                    </div>
                );

            case 'billing':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-2">{t('settings.billing_subscription')}</h3>
                            <p className="text-sm text-gray-400 mb-6">
                                {t('settings.billing_desc')}
                            </p>
                            <div className="text-center py-8 text-gray-500">
                                {t('settings.coming_soon')}
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
