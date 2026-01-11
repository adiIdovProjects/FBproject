'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '../LanguageSwitcher';
import { LayoutDashboard, TrendingUp, Image, Bot, BarChart3 } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;

  const navigation = [
    {
      name: 'Dashboard',
      href: `/${locale}`,
      icon: LayoutDashboard,
      current: pathname === `/${locale}`,
    },
    {
      name: 'Campaigns',
      href: `/${locale}/campaigns`,
      icon: BarChart3,
      current: pathname.startsWith(`/${locale}/campaigns`),
    },
    {
      name: 'Insights',
      href: `/${locale}/insights`,
      icon: TrendingUp,
      current: pathname.startsWith(`/${locale}/insights`),
    },
    {
      name: 'Creatives',
      href: `/${locale}/creatives`,
      icon: Image,
      current: pathname.startsWith(`/${locale}/creatives`),
    },
    {
      name: 'AI Insights',
      href: `/${locale}/ai-insights`,
      icon: Bot,
      current: pathname.startsWith(`/${locale}/ai-insights`),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-400">
                FBWatson
              </h1>
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors
                    ${item.current
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} FBWatson. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
