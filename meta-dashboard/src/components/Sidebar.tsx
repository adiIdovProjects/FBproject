"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BarChart3,
    Palette,
    Settings,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Zap,
    BarChart,
    User,
    Lightbulb,
    ChevronDown,
    ArrowRight
} from 'lucide-react';
import { useAccount } from '@/context/AccountContext';
import { useLocale, useTranslations } from 'next-intl';
import { accountsService } from '@/services/accounts.service';

export const Sidebar: React.FC = () => {
    const t = useTranslations();
    const pathname = usePathname();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';

    // Account Context
    const { selectedAccountId, setSelectedAccountId, linkedAccounts } = useAccount();
    const [isAccountMenuOpen, setIsAccountMenuOpen] = React.useState(false);
    const [quizCompleted, setQuizCompleted] = React.useState<boolean | null>(null);

    const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);

    // Check if account setup quiz is completed
    React.useEffect(() => {
        const checkQuizStatus = async () => {
            if (!selectedAccountId) {
                setQuizCompleted(null);
                return;
            }

            try {
                const response = await accountsService.getAccountQuiz(selectedAccountId);
                console.log('[Sidebar] Quiz status response:', response.data);
                setQuizCompleted(response.data.quiz_completed);
            } catch (error) {
                console.error('Error checking quiz status:', error);
                // If there's an error, assume quiz is not completed (show button)
                setQuizCompleted(false);
            }
        };

        checkQuizStatus();
    }, [selectedAccountId]);

    const navItems = [
        { name: t('nav.dashboard'), href: `/${locale}/dashboard`, icon: LayoutDashboard },
        { name: t('nav.campaigns'), href: `/${locale}/campaigns`, icon: BarChart3 },
        { name: t('nav.creatives'), href: `/${locale}/creatives`, icon: Palette },
        { name: t('nav.insights'), href: `/${locale}/insights`, icon: Lightbulb },
        { name: t('nav.reports'), href: `/${locale}/reports`, icon: BarChart },
        { name: t('nav.ai_investigator'), href: `/${locale}/ai-investigator`, icon: Sparkles },
    ];

    const secondaryItems: any[] = [];

    return (
        <aside
            className={`fixed inset-y-0 ${isRTL ? 'right-0 border-l' : 'left-0 border-r'} w-64 bg-sidebar border-border-subtle flex flex-col z-50 transition-all duration-300`}
        >
            {/* Brand Logo & Account Selector */}
            <div className="p-6 pb-2">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
                        <BarChart3 className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg tracking-tight">AdManager</h2>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Analytics Platform</p>
                    </div>
                </div>

                {/* Account Selector */}
                <div className="relative mb-2">
                    <button
                        onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                        className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                {selectedAccount ? selectedAccount.name[0].toUpperCase() : 'A'}
                            </div>
                            <div className="text-left min-w-0">
                                <p className="text-xs font-bold text-white truncate w-32">
                                    {selectedAccount ? selectedAccount.name : 'Select Account'}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono truncate">
                                    ID: {selectedAccount ? selectedAccount.account_id : '---'}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isAccountMenuOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Dropdown */}
                    {isAccountMenuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsAccountMenuOpen(false)}
                            />
                            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-20 max-h-60 overflow-y-auto">
                                <div className="p-1 space-y-0.5">
                                    {linkedAccounts.length > 0 ? (
                                        linkedAccounts.map((account) => (
                                            <button
                                                key={account.account_id}
                                                onClick={() => {
                                                    setSelectedAccountId(account.account_id);
                                                    setIsAccountMenuOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${selectedAccountId === account.account_id ? 'bg-accent/20 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${selectedAccountId === account.account_id ? 'bg-accent text-white' : 'bg-gray-800'}`}>
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
                                        <div className="p-3 text-center text-xs text-gray-500">
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

            {/* Main Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1">
                <div className="mb-4">
                    <p className="px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Main Menu</p>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-accent/15 text-accent font-black shadow-sm'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'group-hover:text-white'}`} />
                                <span className="text-sm">{item.name}</span>
                                {isActive && (
                                    <div className={`ml-auto w-1.5 h-1.5 rounded-full bg-accent ${isRTL ? 'mr-auto ml-0' : 'ml-auto'}`} />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-border-subtle space-y-2">
                {/* Complete Account Setup Button - Show if quiz not completed */}
                {/* DEBUG: quizCompleted={String(quizCompleted)} */}
                {(quizCompleted === false || quizCompleted === null) && selectedAccountId && (
                    <Link
                        href={`/${locale}/account-quiz?account_id=${selectedAccountId}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:from-purple-600/30 hover:to-pink-600/30 hover:border-purple-500/50 transition-all text-sm group"
                    >
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <span className="flex-1 text-white font-semibold">Complete Setup</span>
                        <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                )}

                {/* Account Settings (per-account) */}
                {selectedAccountId && (
                    <Link
                        href={`/${locale}/accounts/${selectedAccountId}/settings`}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all text-sm ${pathname.includes(`/accounts/${selectedAccountId}/settings`) ? 'bg-white/5 text-white' : ''}`}
                    >
                        <Settings className="w-5 h-5" />
                        <span>{t('settings.account_settings')}</span>
                    </Link>
                )}

                {/* User Settings */}
                <Link
                    href={`/${locale}/settings`}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all text-sm ${pathname === `/${locale}/settings` ? 'bg-white/5 text-white' : ''}`}
                >
                    <User className="w-5 h-5" />
                    <span>{t('settings.user_settings')}</span>
                </Link>
            </div>
        </aside>
    );
};

export default Sidebar;
