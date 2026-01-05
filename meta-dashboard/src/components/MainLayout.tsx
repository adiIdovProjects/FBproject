"use client";
// src/components/MainLayout.tsx
import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
    children: React.ReactNode;
    title: string;
    description: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, title, description }) => {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex overflow-hidden selection:bg-accent/30 selection:text-white">
            {/* Sidebar Component */}
            <Sidebar />

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-y-auto ${isRTL ? 'mr-64 border-r border-white/5' : 'ml-64 border-l border-white/5'} transition-all duration-300 relative`}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent z-10"></div>

                <div className="p-8 sm:p-12 max-w-7xl mx-auto w-full relative z-0">
                    {/* Page Header */}
                    <header className={`mb-12 flex flex-col gap-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-1 bg-accent rounded-full"></div>
                            <div className="w-2 h-1 bg-accent/40 rounded-full"></div>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-white">
                            <span className="bg-gradient-to-r from-white via-white to-accent/50 bg-clip-text text-transparent">
                                {title}
                            </span>
                        </h1>
                        <p className="text-gray-500 text-lg font-medium max-w-3xl leading-relaxed">{description}</p>
                    </header>

                    {/* Page Content */}
                    <main className="space-y-12">{children}</main>

                    {/* Footer */}
                    <footer className="mt-24 pb-12 text-center">
                        <div className="h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent mb-8"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 hover:text-gray-400 transition-colors cursor-default">
                            {t('footer.system_info')}
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
};