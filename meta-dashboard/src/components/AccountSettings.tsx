"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
    User,
    CreditCard,
    Users,
    Shield,
    Save,
    Plus,
    ExternalLink,
    CheckCircle2,
    Crown,
    Settings,
    Target,
    Globe
} from 'lucide-react';
import { fetchActionTypes, toggleActionConversion, ActionType } from '@/services/actions.service';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type TabType = 'profile' | 'billing' | 'team' | 'security' | 'integrations' | 'conversions';

export const AccountSettings: React.FC = () => {
    const t = useTranslations();
    const [activeTab, setActiveTab] = useState<TabType>('profile');

    const tabs = [
        { id: 'profile', label: t('settings.profile'), icon: User },
        { id: 'billing', label: t('settings.billing'), icon: CreditCard },
        { id: 'team', label: t('settings.team'), icon: Users },
        { id: 'security', label: t('settings.security'), icon: Shield },
        { id: 'conversions', label: t('settings.conversions'), icon: Target },
        { id: 'integrations', label: t('settings.integrations'), icon: Settings },
    ];

    const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
    const [isLoadingActions, setIsLoadingActions] = useState(false);

    React.useEffect(() => {
        if (activeTab === 'conversions') {
            loadActionTypes();
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
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-2">{t('settings.conversion_settings')}</h3>
                            <p className="text-sm text-gray-400 mb-6">
                                {t('settings.conversion_settings_description')}
                            </p>

                            {isLoadingActions ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {actionTypes.map((action) => (
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
                                </div>
                            )}
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
                            onClick={() => setActiveTab(tab.id as TabType)}
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
        </div>
    );
};
