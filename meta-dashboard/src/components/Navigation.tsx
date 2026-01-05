"use client";

/**
 * Navigation Component
 * Shared navigation for switching between dashboard pages
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart3, Palette, Search, Lightbulb } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

export const Navigation: React.FC = () => {
    const t = useTranslations();
    const pathname = usePathname();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';

    const navItems = [
        { name: t('nav.dashboard'), href: `/${locale}`, icon: LayoutDashboard },
        { name: t('nav.campaigns'), href: `/${locale}/campaigns`, icon: BarChart3 },
        { name: t('nav.creatives'), href: `/${locale}/creatives`, icon: Palette },
        { name: t('nav.insights'), href: `/${locale}/insights`, icon: Lightbulb },
        { name: t('nav.ai_investigator'), href: `/${locale}/ai-investigator`, icon: Search },
    ];

    return (
        <nav className={`flex items-center gap-6 mb-8 border-b border-gray-800 pb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${isActive
                            ? 'bg-indigo-600/20 text-indigo-400 font-bold'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                            }`}
                    >
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                    </Link>
                );
            })}
        </nav>
    );
};

export default Navigation;
