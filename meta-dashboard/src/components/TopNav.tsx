"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BarChart3,
    Home,
    TrendingUp,
    Sliders,
    Plus,
    ChevronDown,
    Sparkles,
    Settings,
    User,
    Shield,
    Upload,
    Palette,
    Target,
    GraduationCap,
    Lightbulb,
    FileText,
    LayoutDashboard,
} from 'lucide-react';
import { useAccount } from '@/context/AccountContext';
import { useUser } from '@/context/UserContext';
import { useLocale, useTranslations } from 'next-intl';
import { useAIChat } from '@/context/AIChatContext';
import { useTheme } from '@/context/ThemeContext';
import ThemeSelector from '@/components/ThemeSelector';

export const TopNav: React.FC = () => {
    const { theme } = useTheme();
    const isColorful = theme === 'colorful';
    const t = useTranslations();
    const pathname = usePathname();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';
    const { openChat } = useAIChat();

    // Account Context
    const { selectedAccountId, setSelectedAccountId, linkedAccounts } = useAccount();
    const { isAdmin } = useUser();
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const [isAdvancedMenuOpen, setIsAdvancedMenuOpen] = useState(false);

    const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);

    // Main nav items
    const mainNavItems = [
        { name: t('topnav.home'), href: `/${locale}/homepage2`, icon: Home },
        { name: t('topnav.performance'), href: `/${locale}/performance`, icon: TrendingUp },
        { name: t('topnav.campaigns'), href: `/${locale}/campaigns2`, icon: Sliders },
        { name: t('topnav.create'), href: `/${locale}/create`, icon: Plus },
    ];

    // Advanced menu items (power user features)
    const advancedItems = [
        { name: t('nav.campaign_control'), href: `/${locale}/campaign-control`, icon: Sliders },
        { name: t('nav.uploader'), href: `/${locale}/uploader`, icon: Upload },
        { name: t('nav.account_performance'), href: `/${locale}/account-dashboard`, icon: LayoutDashboard },
        { name: t('nav.campaigns_performance'), href: `/${locale}/campaigns`, icon: TrendingUp },
        { name: t('nav.creative_performance'), href: `/${locale}/creatives`, icon: Palette },
        { name: t('nav.targeting_performance'), href: `/${locale}/targeting`, icon: Target },
        { name: t('nav.insights'), href: `/${locale}/insights`, icon: Lightbulb },
        { name: t('nav.custom_reports'), href: `/${locale}/reports`, icon: FileText },
        { name: t('nav.learning_center'), href: `/${locale}/learning`, icon: GraduationCap },
    ];

    const isActive = (href: string) => pathname === href;

    return (
        <header
            className={`fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-border-subtle flex items-center px-4 z-50`}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* Logo */}
            <Link href={`/${locale}/homepage2`} className="flex items-center gap-2 mr-6 rtl:mr-0 rtl:ml-6">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isColorful ? 'bg-gradient-to-br from-cyan-400 to-purple-500' : 'bg-accent'}`}>
                    <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-foreground hidden sm:block">AdManager</span>
            </Link>

            {/* Main Navigation */}
            <nav className="flex items-center gap-1">
                {mainNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                active
                                    ? 'bg-accent/15 text-accent'
                                    : 'text-text-muted hover:text-foreground hover:bg-secondary/50'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="hidden md:inline">{item.name}</span>
                        </Link>
                    );
                })}

                {/* Advanced Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsAdvancedMenuOpen(!isAdvancedMenuOpen)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isAdvancedMenuOpen
                                ? 'bg-secondary/50 text-foreground'
                                : 'text-text-muted hover:text-foreground hover:bg-secondary/50'
                        }`}
                    >
                        <span className="hidden md:inline">{t('topnav.advanced')}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isAdvancedMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isAdvancedMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsAdvancedMenuOpen(false)} />
                            <div className={`absolute top-full mt-1 ${isRTL ? 'right-0' : 'left-0'} w-56 bg-card border border-border-subtle rounded-xl shadow-xl overflow-hidden z-20`}>
                                <div className="p-1 max-h-80 overflow-y-auto">
                                    {advancedItems.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsAdvancedMenuOpen(false)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                                    isActive(item.href)
                                                        ? 'bg-accent/15 text-accent'
                                                        : 'text-text-muted hover:text-foreground hover:bg-secondary/50'
                                                }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {item.name}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </nav>

            {/* Right Side - Account Selector, Settings, AI */}
            <div className="flex items-center gap-2 ml-auto rtl:ml-0 rtl:mr-auto">
                {/* Theme Selector */}
                <div className="hidden sm:block">
                    <ThemeSelector />
                </div>

                {/* Account Selector */}
                <div className="relative">
                    <button
                        onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                            isAccountMenuOpen ? 'bg-secondary/50' : 'hover:bg-secondary/50'
                        }`}
                    >
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-white font-bold text-xs">
                            {selectedAccount ? selectedAccount.name[0].toUpperCase() : 'A'}
                        </div>
                        <span className="text-xs font-medium text-foreground hidden lg:block max-w-24 truncate">
                            {selectedAccount?.name || 'Account'}
                        </span>
                        <ChevronDown className={`w-3 h-3 text-text-muted transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isAccountMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsAccountMenuOpen(false)} />
                            <div className={`absolute top-full mt-1 ${isRTL ? 'left-0' : 'right-0'} w-64 bg-card border border-border-subtle rounded-xl shadow-xl overflow-hidden z-20`}>
                                <div className="p-1 max-h-60 overflow-y-auto">
                                    {linkedAccounts.length > 0 ? (
                                        linkedAccounts.map((account) => (
                                            <button
                                                key={account.account_id}
                                                onClick={() => {
                                                    setSelectedAccountId(account.account_id);
                                                    setIsAccountMenuOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                                                    selectedAccountId === account.account_id
                                                        ? 'bg-accent/20 text-foreground'
                                                        : 'text-text-muted hover:bg-secondary/50 hover:text-foreground'
                                                }`}
                                            >
                                                <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                                                    selectedAccountId === account.account_id ? 'bg-accent text-white' : 'bg-secondary'
                                                }`}>
                                                    {account.name[0]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate">{account.name}</p>
                                                    <p className="text-[9px] opacity-70 truncate">{account.account_id}</p>
                                                </div>
                                                {selectedAccountId === account.account_id && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                                )}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-3 text-center text-xs text-text-muted">
                                            No accounts linked.
                                        </div>
                                    )}
                                </div>
                                <div className="border-t border-border-subtle p-1">
                                    <Link
                                        href={`/${locale}/settings`}
                                        onClick={() => setIsAccountMenuOpen(false)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-muted hover:text-foreground hover:bg-secondary/50"
                                    >
                                        <User className="w-4 h-4" />
                                        {t('settings.user_settings')}
                                    </Link>
                                    {selectedAccountId && (
                                        <Link
                                            href={`/${locale}/accounts/${selectedAccountId}/settings`}
                                            onClick={() => setIsAccountMenuOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-muted hover:text-foreground hover:bg-secondary/50"
                                        >
                                            <Settings className="w-4 h-4" />
                                            {t('settings.account_settings')}
                                        </Link>
                                    )}
                                    {isAdmin && (
                                        <Link
                                            href={`/${locale}/admin`}
                                            onClick={() => setIsAccountMenuOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-accent hover:bg-accent/20"
                                        >
                                            <Shield className="w-4 h-4" />
                                            Admin Dashboard
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* AI Chat Button */}
                <button
                    onClick={() => openChat()}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">AI</span>
                </button>
            </div>
        </header>
    );
};

export default TopNav;
