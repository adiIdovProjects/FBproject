"use client";
// src/components/MainLayout.tsx
import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { GlossaryPanel } from './ui/GlossaryPanel';
import { AIChat } from './insights/AIChat';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useTheme } from '@/context/ThemeContext';
import { useAIChat } from '@/context/AIChatContext';
import { useAccount } from '@/context/AccountContext';

interface MainLayoutProps {
    children: React.ReactNode;
    title: string;
    description: string;
    compact?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, title, description, compact = false }) => {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';
    const { theme } = useTheme();
    const isColorful = theme === 'colorful';
    const { isOpen, initialQuery, openChat, closeChat } = useAIChat();
    const { selectedAccountId } = useAccount();

    // Track page views automatically
    usePageTracking();

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex overflow-hidden selection:bg-accent/30 selection:text-white">
            {/* Sidebar Component */}
            <Sidebar />

            {/* Glossary Help Panel */}
            <GlossaryPanel />

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-y-auto ${isRTL ? 'mr-64 border-r border-border-color' : 'ml-64 border-l border-border-color'} transition-all duration-300 relative`}>
                {/* Accent bar - rainbow gradient in colorful mode */}
                <div className={`absolute top-0 left-0 right-0 h-px z-10 ${isColorful ? 'accent-bar-colorful' : 'bg-gradient-to-r from-transparent via-accent/20 to-transparent'}`}></div>

                <div className={`${compact ? 'p-4 sm:p-6' : 'p-8 sm:p-12'} max-w-7xl w-full relative z-0 ${isRTL ? 'ml-auto' : 'mx-auto'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {/* Page Header */}
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

                    {/* Page Content */}
                    <main className="space-y-12">{children}</main>

                    {/* Footer */}
                    <footer className={`${compact ? 'mt-12' : 'mt-24'} pb-12 text-center`}>
                        <div className="h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent mb-8"></div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-text-disabled hover:text-text-muted transition-colors cursor-default">
                            {t('footer.system_info')}
                        </p>
                        <div className="mt-4 flex justify-center gap-4 text-xs text-text-muted">
                            <Link href={`/${locale}/privacy-policy`} className="hover:text-accent transition-colors">
                                {t('footer.privacy') || 'Privacy'}
                            </Link>
                            <Link href={`/${locale}/terms`} className="hover:text-accent transition-colors">
                                {t('footer.terms') || 'Terms'}
                            </Link>
                            <Link href={`/${locale}/accessibility`} className="hover:text-accent transition-colors">
                                {t('accessibility.footer_link') || 'Accessibility'}
                            </Link>
                        </div>
                    </footer>
                </div>
            </div>

            {/* Floating AI Chat Button */}
            <button
                onClick={() => openChat()}
                className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-40 w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group`}
                aria-label={t('insights.open_ai_chat')}
            >
                <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
            </button>

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