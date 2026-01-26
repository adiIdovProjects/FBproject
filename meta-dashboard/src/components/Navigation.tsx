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
        <nav className={`flex items-center gap-2 mb-8 p-2 rounded-xl bg-navbar border border-navbar-border shadow-sm ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium ${isActive
                            ? 'bg-accent text-accent-text shadow-md'
                            : 'text-navbar-text hover:text-foreground hover:bg-navbar-hover'
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
