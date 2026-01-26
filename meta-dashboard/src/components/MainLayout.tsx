"use client";
// src/components/MainLayout.tsx
import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Sidebar } from './Sidebar';
import { usePageTracking } from '@/hooks/usePageTracking';

interface MainLayoutProps {
    children: React.ReactNode;
    title: string;
    description: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, title, description }) => {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';

    // Track page views automatically
    usePageTracking();

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex overflow-hidden selection:bg-accent/30 selection:text-white">
            {/* Sidebar Component */}
            <Sidebar />

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-y-auto ${isRTL ? 'mr-64 border-r border-border-color' : 'ml-64 border-l border-border-color'} transition-all duration-300 relative`}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent z-10"></div>

                <div className={`p-8 sm:p-12 max-w-7xl w-full relative z-0 ${isRTL ? 'ml-auto' : 'mx-auto'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {/* Page Header */}
                    <header className="mb-12 flex flex-col gap-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-1 bg-accent rounded-full"></div>
                            <div className="w-2 h-1 bg-accent/40 rounded-full"></div>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-foreground">
                            {title}
                        </h1>
                        <p className="text-text-muted text-lg font-medium max-w-3xl leading-relaxed">{description}</p>
                    </header>

                    {/* Page Content */}
                    <main className="space-y-12">{children}</main>

                    {/* Footer */}
                    <footer className="mt-24 pb-12 text-center">
                        <div className="h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent mb-8"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-disabled hover:text-text-muted transition-colors cursor-default">
                            {t('footer.system_info')}
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
};