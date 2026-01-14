"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Building2,
  Activity,
  ArrowLeft,
  Shield,
  BarChart3,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check admin access
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await apiClient.get('/api/v1/users/me');
        if (!response.data.is_admin) {
          router.push(`/${locale}/account-dashboard`);
          return;
        }
        setIsAdmin(true);
      } catch {
        router.push(`/${locale}/login`);
      }
    };
    checkAdmin();
  }, [router, locale]);

  const adminNav = [
    { name: 'Overview', href: `/${locale}/admin`, icon: LayoutDashboard },
    { name: 'Users', href: `/${locale}/admin/users`, icon: Users },
    { name: 'Revenue', href: `/${locale}/admin/revenue`, icon: DollarSign },
    { name: 'Accounts', href: `/${locale}/admin/accounts`, icon: Building2 },
    { name: 'Activity', href: `/${locale}/admin/activity`, icon: Activity },
  ];

  // Check if current path matches nav item (handle nested routes)
  const isActive = (href: string) => {
    if (href === `/${locale}/admin`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Show loading while checking admin
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white flex">
      {/* Admin Sidebar */}
      <aside className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} w-64 bg-[#111318] border-r border-gray-800 flex flex-col z-50`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Admin Panel</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Management</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  active
                    ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-indigo-400' : ''}`} />
                <span>{item.name}</span>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Return to Dashboard */}
        <div className="p-4 border-t border-gray-800">
          <Link
            href={`/${locale}/account-dashboard`}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 ${isRTL ? 'mr-64' : 'ml-64'}`}>
        <div className="p-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-1 bg-indigo-500 rounded-full"></div>
              <div className="w-2 h-1 bg-indigo-500/40 rounded-full"></div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
            {description && (
              <p className="text-gray-500">{description}</p>
            )}
          </header>

          {/* Page Content */}
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
