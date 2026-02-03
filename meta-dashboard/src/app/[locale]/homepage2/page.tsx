"use client";

/**
 * Homepage2 - New simplified homepage with AI summary and metrics
 * Shows actual data instead of action cards
 */

import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MainLayout2 } from '../../../components/MainLayout2';
import { useUser } from '../../../context/UserContext';
import AISummaryCard from '../../../components/homepage/AISummaryCard';
import HomepageMetrics from '../../../components/homepage/HomepageMetrics';
import QuickActions from '../../../components/homepage/QuickActions';

export default function Homepage2() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();

  // Redirect to connect Facebook if user hasn't connected yet
  useEffect(() => {
    if (!isUserLoading && user && !user.facebook_id) {
      router.replace(`/${locale}/onboard/connect-facebook`);
    }
  }, [user, isUserLoading, router, locale]);

  // Get first name for greeting
  const firstName = user?.full_name?.split(' ')[0] || t('homepage2.default_name');

  return (
    <MainLayout2 title="" description="" compact>
      {/* Greeting */}
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          {t('homepage2.greeting', { name: firstName })}
        </h1>
        <p className="text-gray-400 text-sm">{t('homepage2.subtitle')}</p>
      </div>

      {/* AI Summary Card */}
      <div className="max-w-3xl mx-auto mb-6">
        <AISummaryCard locale={locale} />
      </div>

      {/* Key Metrics */}
      <div className="max-w-4xl mx-auto mb-8">
        <HomepageMetrics locale={locale} />
      </div>

      {/* Quick Actions */}
      <div className="max-w-3xl mx-auto">
        <QuickActions />
      </div>
    </MainLayout2>
  );
}
