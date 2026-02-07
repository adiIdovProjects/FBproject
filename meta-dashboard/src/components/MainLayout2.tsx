"use client";
// src/components/MainLayout2.tsx
// New layout with TopNav instead of Sidebar - for new simplified pages

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TopNav } from './TopNav';
import { GlossaryPanel } from './ui/GlossaryPanel';
import { AIChat } from './insights/AIChat';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useTheme } from '@/context/ThemeContext';
import { useAIChat } from '@/context/AIChatContext';
import { useAccount } from '@/context/AccountContext';

interface MainLayout2Props {
    children: React.ReactNode;
    title: string;
    description?: string;
    compact?: boolean;
}

export const MainLayout2: React.FC<MainLayout2Props> = ({ children, title, description, compact = false }) => {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';
    const { theme } = useTheme();
    const isColorful = theme === 'colorful';
    const { isOpen, initialQuery, closeChat } = useAIChat();
    const { selectedAccountId } = useAccount();

    // Track page views automatically
    usePageTracking();

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col overflow-hidden selection:bg-accent/30 selection:text-white">
            {/* Top Navigation */}
            <TopNav />

            {/* Glossary Help Panel */}
            <GlossaryPanel />

            {/* Main Content Area - full width with top padding for nav */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto pt-14">
                {/* Accent bar - rainbow gradient in colorful mode */}
                <div className={`absolute top-14 left-0 right-0 h-px z-10 ${isColorful ? 'accent-bar-colorful' : 'bg-gradient-to-r from-transparent via-accent/20 to-transparent'}`}></div>

                <div className={`${compact ? 'p-4 sm:p-6' : 'p-8 sm:p-12'} max-w-7xl w-full relative z-0 mx-auto`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {/* Page Header */}
                    {title && (
                        <header className={`${compact ? 'mb-4' : 'mb-12'} flex flex-col gap-3`}>
                            {!compact && (
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-8 h-1 rounded-full ${isColorful ? 'accent-bar-colorful' : 'bg-accent'}`}></div>
                                    <div className={`w-2 h-1 rounded-full ${isColorful ? 'bg-[#00F5D4]' : 'bg-accent/40'}`}></div>
                                </div>
                            )}
                            <h1 className={`${compact ? 'text-3xl' : 'text-5xl'} font-black tracking-tighter text-foreground`}>
                                {title}
                            </h1>
                            {description && <p className="text-text-muted text-lg font-medium max-w-3xl leading-relaxed">{description}</p>}
                        </header>
                    )}

                    {/* Page Content */}
                    <main className="space-y-12">{children}</main>

                    {/* Footer */}
                    <footer className={`${compact ? 'mt-12' : 'mt-24'} pb-12 text-center`}>
                        <div className="h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent mb-8"></div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-text-disabled hover:text-text-muted transition-colors cursor-default">
                            {t('footer.system_info')}
                        </p>
                    </footer>
                </div>
            </div>

            {/* AI Chat Drawer */}
            <AIChat
                isOpen={isOpen}
                onClose={closeChat}
                accountId={selectedAccountId || undefined}
                initialQuery={initialQuery}
            />
        </div>
    );
};

export default MainLayout2;
