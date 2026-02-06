"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BarChart3,
    Settings,
    ChevronRight,
    Sparkles,
    PlusCircle,
    User,
    Lightbulb,
    TrendingUp,
    Home,
    Shield,
    MessageSquare,
    FileText,
} from 'lucide-react';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import { useAccount } from '@/context/AccountContext';
import { useUser } from '@/context/UserContext';
import { useLocale, useTranslations } from 'next-intl';
import ThemeSelector from '@/components/ThemeSelector';
import { useTheme } from '@/context/ThemeContext';

export const Sidebar: React.FC = () => {
    const { theme } = useTheme();
    const isColorful = theme === 'colorful';
    const t = useTranslations();
    const pathname = usePathname();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';

    // Account Context
    const { selectedAccountId, setSelectedAccountId, linkedAccounts } = useAccount();
    const { isAdmin } = useUser();
    const [isAccountMenuOpen, setIsAccountMenuOpen] = React.useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = React.useState(false);

    const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);

    // Flat navigation - 6 simple items
    const navItems = [
        { name: t('nav.dashboard') || 'Dashboard', href: `/${locale}/homepage`, icon: Home },
        { name: t('nav.my_report') || 'My Report', href: `/${locale}/my-reports`, icon: FileText },
        { name: t('nav.create_ad') || 'Create Ad', href: `/${locale}/uploader/ai-captain`, icon: PlusCircle },
        { name: t('nav.campaigns') || 'Campaigns', href: `/${locale}/campaigns2`, icon: TrendingUp },
        { name: t('nav.insights') || 'Insights', href: `/${locale}/insights`, icon: Lightbulb },
        { name: t('nav.ask_ai') || 'Ask AI', href: `/${locale}/ai-investigator`, icon: Sparkles },
    ];

    return (
        <aside
            className={`fixed inset-y-0 ${isRTL ? 'right-0 border-l' : 'left-0 border-r'} w-64 bg-sidebar border-border-subtle flex flex-col z-50 transition-all duration-300`}
        >
            {/* Brand Logo & Account Selector */}
            <div className="p-6 pb-2">
                <div className="flex items-center gap-3 mb-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${isColorful ? 'bg-gradient-to-br from-cyan-400 to-purple-500 shadow-cyan-500/30' : 'bg-accent shadow-accent/20'}`}>
                        <BarChart3 className={`w-6 h-6 ${isColorful ? 'text-white' : 'text-accent-text'}`} />
                    </div>
                    <div>
                        <h2 className={`font-bold text-lg tracking-tight ${isColorful ? 'text-white' : 'text-foreground'}`}>AdManager</h2>
                        <p className={`text-[10px] font-medium uppercase tracking-widest ${isColorful ? 'text-cyan-300' : 'text-text-muted'}`}>Analytics Platform</p>
                    </div>
                </div>

                {/* Account Selector */}
                <div className="relative mb-2">
                    <button
                        onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                            isColorful
                                ? 'bg-gradient-to-r from-purple-900/50 to-indigo-900/50 hover:from-purple-800/50 hover:to-indigo-800/50 border border-cyan-500/30 hover:border-cyan-400/50 shadow-[0_0_10px_rgba(0,212,255,0.1)]'
                                : 'bg-secondary/50 hover:bg-secondary border border-border-subtle'
                        }`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-accent-text font-bold text-xs shrink-0">
                                {selectedAccount ? selectedAccount.name[0].toUpperCase() : 'A'}
                            </div>
                            <div className="text-left min-w-0">
                                <p className="text-xs font-bold text-foreground truncate w-32">
                                    {selectedAccount ? selectedAccount.name : 'Select Account'}
                                </p>
                                <p className="text-[10px] text-text-muted font-mono truncate">
                                    ID: {selectedAccount ? selectedAccount.account_id : '---'}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${isAccountMenuOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Dropdown */}
                    {isAccountMenuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsAccountMenuOpen(false)}
                            />
                            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border-subtle rounded-xl shadow-xl overflow-hidden z-20 max-h-60 overflow-y-auto">
                                <div className="p-1 space-y-0.5">
                                    {linkedAccounts.length > 0 ? (
                                        linkedAccounts.map((account) => (
                                            <button
                                                key={account.account_id}
                                                onClick={() => {
                                                    setSelectedAccountId(account.account_id);
                                                    setIsAccountMenuOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${selectedAccountId === account.account_id ? 'bg-accent/20 text-foreground' : 'text-text-muted hover:bg-secondary/50 hover:text-foreground'}`}
                                            >
                                                <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${selectedAccountId === account.account_id ? 'bg-accent text-accent-text' : 'bg-secondary'}`}>
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
                                            No accounts found.
                                            <br />
                                            <Link href={`/${locale}/settings`} className="text-accent hover:underline">Connect an account</Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Main Navigation - Flat List */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                                isActive
                                    ? isColorful
                                        ? 'bg-cyan-500/20 text-cyan-300 font-bold shadow-[0_0_15px_rgba(0,212,255,0.3)]'
                                        : 'bg-accent/15 text-accent font-bold'
                                    : isColorful
                                        ? 'text-indigo-200 hover:text-cyan-300 hover:bg-cyan-500/10'
                                        : 'text-text-muted hover:text-foreground hover:bg-secondary/50'
                            } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? (isColorful ? 'text-cyan-300' : 'text-accent') : ''}`} />
                            <span className="text-sm">{item.name}</span>
                            {isActive && (
                                <div className={`w-1.5 h-1.5 rounded-full ${isColorful ? 'bg-cyan-400' : 'bg-accent'} ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-border-subtle space-y-2">
                {/* Account Settings (per-account) */}
                {selectedAccountId && (
                    <Link
                        href={`/${locale}/accounts/${selectedAccountId}/settings`}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-foreground hover:bg-secondary transition-all text-sm ${pathname.includes(`/accounts/${selectedAccountId}/settings`) ? 'bg-secondary/50 text-foreground' : ''} `}
                    >
                        <Settings className={`w-5 h-5 ${isRTL ? 'order-last' : ''}`} />
                        <span className={isRTL ? 'flex-1' : ''}>{t('settings.account_settings')}</span>
                    </Link>
                )}

                {/* User Settings */}
                <Link
                    href={`/${locale}/settings`}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-foreground hover:bg-secondary transition-all text-sm ${pathname === `/${locale}/settings` ? 'bg-secondary/50 text-foreground' : ''} `}
                >
                    <User className={`w-5 h-5 ${isRTL ? 'order-last' : ''}`} />
                    <span className={isRTL ? 'flex-1' : ''}>{t('settings.user_settings')}</span>
                </Link>

                {/* Admin Dashboard - Only visible for admins */}
                {isAdmin && (
                    <Link
                        href={`/${locale}/admin`}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-accent hover:text-foreground hover:bg-accent/20 transition-all text-sm ${pathname === `/${locale}/admin` ? 'bg-accent/20 text-foreground' : ''} `}
                    >
                        <Shield className={`w-5 h-5 ${isRTL ? 'order-last' : ''}`} />
                        <span className={isRTL ? 'flex-1' : ''}>Admin Dashboard</span>
                    </Link>
                )}

                {/* Feedback Button */}
                <button
                    onClick={() => setIsFeedbackOpen(true)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-foreground hover:bg-secondary transition-all text-sm w-full ${isRTL ? 'flex-row-reverse' : ''}`}
                    title={t('feedback.button_tooltip')}
                >
                    <MessageSquare className={`w-5 h-5 ${isRTL ? 'order-last' : ''}`} />
                    <span className={isRTL ? 'flex-1' : ''}>{t('feedback.title')}</span>
                </button>

                {/* Theme Selector */}
                <div className="pt-2 border-t border-border-subtle mt-2">
                    <div className={`flex items-center gap-2 px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs text-text-muted">{t('theme.label')}</span>
                        <ThemeSelector />
                    </div>
                </div>
            </div>

            {/* Feedback Modal */}
            <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        </aside>
    );
};

export default Sidebar;
