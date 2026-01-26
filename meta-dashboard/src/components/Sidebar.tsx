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
    PlusCircle,
    BarChart,
    User,
    Lightbulb,
    ChevronDown,
    ArrowRight,
    Target,
    ChevronUp,
    Sliders,
    Brain,
    Upload,
    Shield,
    TrendingUp,
    FileText,
    GraduationCap,
    Home
} from 'lucide-react';
import { useAccount } from '@/context/AccountContext';
import { useUser } from '@/context/UserContext';
import { useLocale, useTranslations } from 'next-intl';
import { accountsService } from '@/services/accounts.service';
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
    const [quizCompleted, setQuizCompleted] = React.useState<boolean | null>(null);

    // Section expand/collapse state - default to expanded, load from localStorage in useEffect
    const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
        analytics: true,
        manage_account: true,
        intelligence: true
    });

    // Load expanded sections from localStorage after mount (prevents hydration mismatch)
    React.useEffect(() => {
        const saved = localStorage.getItem('sidebar-expanded-sections');
        if (saved) {
            try {
                setExpandedSections(JSON.parse(saved));
            } catch {
                // Keep defaults
            }
        }
    }, []);

    // Auto-expand section if nested item is active
    React.useEffect(() => {
        const analyticsRoutes = ['/account-dashboard', '/campaigns', '/targeting', '/creatives'];
        const manageRoutes = ['/campaign-control', '/uploader', '/learning'];
        const intelligenceRoutes = ['/insights', '/reports', '/ai-investigator'];

        const isAnalyticsActive = analyticsRoutes.some(route => pathname.includes(route));
        const isManageActive = manageRoutes.some(route => pathname.includes(route));
        const isIntelligenceActive = intelligenceRoutes.some(route => pathname.includes(route));

        setExpandedSections(prev => {
            let updated = { ...prev };
            if (isAnalyticsActive && !prev.analytics) updated.analytics = true;
            if (isManageActive && !prev.manage_account) updated.manage_account = true;
            if (isIntelligenceActive && !prev.intelligence) updated.intelligence = true;

            if (JSON.stringify(updated) !== JSON.stringify(prev)) {
                localStorage.setItem('sidebar-expanded-sections', JSON.stringify(updated));
                return updated;
            }
            return prev;
        });
    }, [pathname]);

    const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);

    // Check if account setup quiz is completed
    React.useEffect(() => {
        const checkQuizStatus = async () => {
            // Skip on public pages to avoid auth race conditions
            if (typeof window !== 'undefined') {
                const path = window.location.pathname;
                const isPublicPage = path.includes('/login') ||
                                     path.includes('/callback') ||
                                     path.includes('/auth/verify') ||
                                     path.includes('/onboard') ||
                                     path.includes('/select-accounts') ||
                                     path.includes('/connect');
                if (isPublicPage) return;
            }

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

    // Navigation structure with sections
    const navStructure = [
        {
            type: 'section' as const,
            id: 'analytics',
            name: t('nav.analytics'),
            icon: BarChart3,
            items: [
                { name: t('nav.account_performance'), href: `/${locale}/account-dashboard`, icon: LayoutDashboard },
                { name: t('nav.campaigns_performance'), href: `/${locale}/campaigns`, icon: TrendingUp },
                { name: t('nav.targeting_performance'), href: `/${locale}/targeting`, icon: Target },
                { name: t('nav.creative_performance'), href: `/${locale}/creatives`, icon: Palette },
            ]
        },
        {
            type: 'section' as const,
            id: 'manage_account',
            name: t('nav.manage_account'),
            icon: Sliders,
            items: [
                { name: t('nav.campaign_control'), href: `/${locale}/campaign-control`, icon: Sliders },
                { name: t('nav.uploader'), href: `/${locale}/uploader`, icon: Upload },
                { name: t('nav.learning_center'), href: `/${locale}/learning`, icon: GraduationCap },
            ]
        },
        {
            type: 'section' as const,
            id: 'intelligence',
            name: t('nav.intelligence'),
            icon: Brain,
            items: [
                { name: t('nav.insights'), href: `/${locale}/insights`, icon: Lightbulb },
                { name: t('nav.custom_reports'), href: `/${locale}/reports`, icon: FileText },
                { name: t('nav.ai_investigator'), href: `/${locale}/ai-investigator`, icon: Sparkles },
            ]
        },
    ];

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => {
            const updated = { ...prev, [sectionId]: !prev[sectionId] };
            localStorage.setItem('sidebar-expanded-sections', JSON.stringify(updated));
            return updated;
        });
    };

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

            {/* Main Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {/* Home Link - Always visible at top */}
                <Link
                    href={`/${locale}/homepage`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 mb-4 ${
                        pathname === `/${locale}/homepage`
                            ? isColorful
                                ? 'bg-cyan-500/20 text-cyan-300 font-bold shadow-[0_0_15px_rgba(0,212,255,0.3)]'
                                : 'bg-accent/15 text-accent font-bold'
                            : isColorful
                                ? 'text-indigo-200 hover:text-cyan-300 hover:bg-cyan-500/10'
                                : 'text-text-muted hover:text-foreground hover:bg-secondary/50'
                    } ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                    <Home className={`w-5 h-5 ${pathname === `/${locale}/homepage` ? 'text-accent' : ''}`} />
                    <span className="text-sm">{t('homepage.title')}</span>
                    {pathname === `/${locale}/homepage` && (
                        <div className="w-1.5 h-1.5 rounded-full bg-accent ml-auto" />
                    )}
                </Link>

                <div className="mb-4">
                    <p className={`px-2 text-[10px] font-semibold uppercase tracking-widest mb-2 ${isColorful ? 'text-cyan-400/70' : 'text-text-muted'}`}>Main Menu</p>
                    {navStructure.map((item) => {
                        // Section rendering
                        if (item.type === 'section') {
                            const isExpanded = expandedSections[item.id];
                            const Icon = item.icon;
                            const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;

                            return (
                                <div key={item.id}>
                                    <button
                                        onClick={() => toggleSection(item.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isRTL ? 'flex-row-reverse' : ''} ${
                                            isColorful
                                                ? 'text-indigo-200 hover:text-cyan-300 hover:bg-cyan-500/10'
                                                : 'text-text-muted hover:text-foreground hover:bg-secondary/50'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5 group-hover:text-foreground" />
                                        <span className={`text-sm flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>{item.name}</span>
                                        <ChevronIcon className={`w-4 h-4 transition-transform duration-200 ${isRTL ? 'rotate-0' : ''}`} />
                                    </button>

                                    {isExpanded && (
                                        <div className="mt-1 space-y-1">
                                            {item.items.map((subItem: any) => {
                                                const isActive = pathname === subItem.href;
                                                const SubIcon = subItem.icon;
                                                const isHighlight = subItem.highlight;

                                                return (
                                                    <Link
                                                        key={subItem.href}
                                                        href={subItem.href}
                                                        className={`flex items-center gap-3 py-2 rounded-xl transition-all duration-200 group ${isRTL ? 'pr-12 pl-3' : 'pl-12 pr-3'} ${
                                                            isHighlight
                                                                ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:from-purple-600/30 hover:to-pink-600/30 text-foreground font-semibold'
                                                                : isActive
                                                                    ? isColorful
                                                                        ? 'bg-cyan-500/20 text-cyan-300 font-black shadow-[0_0_15px_rgba(0,212,255,0.3)] border-l-2 border-cyan-400'
                                                                        : 'bg-accent/15 text-accent font-black shadow-sm'
                                                                    : isColorful
                                                                        ? 'text-indigo-200 hover:text-cyan-300 hover:bg-cyan-500/10'
                                                                        : 'text-text-muted hover:text-foreground hover:bg-secondary/50'
                                                        }`}
                                                    >
                                                        {isRTL ? (
                                                            <>
                                                                {isActive && !isHighlight && (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                                                )}
                                                                <SubIcon className={`w-4 h-4 ${isHighlight ? 'text-purple-400' : isActive ? 'text-accent' : 'group-hover:text-foreground'}`} />
                                                                <span className="text-sm">{subItem.name}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {isActive && !isHighlight && (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                                                )}
                                                                <SubIcon className={`w-4 h-4 ${isHighlight ? 'text-purple-400' : isActive ? 'text-accent' : 'group-hover:text-foreground'}`} />
                                                                <span className="text-sm">{subItem.name}</span>
                                                            </>
                                                        )}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return null;
                    })}
                </div>
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-border-subtle space-y-2">
                {/* Complete Account Setup Button - Show only if quiz explicitly not completed */}
                {quizCompleted === false && selectedAccountId && (
                    <Link
                        href={`/${locale}/account-quiz?account_id=${selectedAccountId}`}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:from-purple-600/30 hover:to-pink-600/30 hover:border-purple-500/50 transition-all text-sm group`}
                    >
                        <Sparkles className={`w-5 h-5 text-purple-400 ${isRTL ? 'order-last' : ''}`} />
                        <span className="flex-1 text-foreground font-semibold">Complete Setup</span>
                        <ArrowRight className={`w-4 h-4 text-purple-400 transition-transform ${isRTL ? 'order-first group-hover:-translate-x-0.5 rotate-180' : 'group-hover:translate-x-0.5'}`} />
                    </Link>
                )}

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

                {/* Theme Selector */}
                <div className="pt-2 border-t border-border-subtle mt-2">
                    <div className={`flex items-center gap-2 px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs text-text-muted">{t('theme.label')}</span>
                        <ThemeSelector />
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
