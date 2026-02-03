"use client";

/**
 * Homepage - Simplified homepage for beginners
 * Shows: KPIs + AI Summary + 2 navigation buttons
 */

import { useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Sparkles } from 'lucide-react';
import { MainLayout2 } from '../../../components/MainLayout2';
import { useUser } from '../../../context/UserContext';
import HomepageKPICards from '../../../components/homepage/HomepageKPICards';
import AISummaryCard from '../../../components/homepage/AISummaryCard';
import { formatDate, calculateDateRange } from '../../../utils/date';

export default function Homepage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();

  // Fixed to last 7 days (no date picker needed)
  const dates = useMemo(() => calculateDateRange('last_7_days'), []);
  const startDate = formatDate(dates.start);
  const endDate = formatDate(dates.end);

  // Redirect to connect Facebook if user hasn't connected yet
  useEffect(() => {
    if (!isUserLoading && user && !user.facebook_id) {
      router.replace(`/${locale}/onboard/connect-facebook`);
    }
  }, [user, isUserLoading, router, locale]);

  // Get first name for greeting
  const firstName = user?.full_name?.split(' ')[0] || t('homepage3.default_name');

  const navigateTo = (path: string) => {
    router.push(`/${locale}${path}`);
  };

  return (
    <MainLayout2 title={t('homepage3.title')} description="" compact>
      {/* Greeting */}
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          {t('homepage3.greeting', { name: firstName })}
        </h1>
        <p className="text-gray-400 text-sm">{t('homepage3.subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="max-w-4xl mx-auto mb-6">
        <HomepageKPICards
          startDate={startDate}
          endDate={endDate}
          locale={locale}
        />
      </div>

      {/* AI Summary */}
      <div className="max-w-3xl mx-auto mb-8">
        <AISummaryCard locale={locale} />
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
        <button
          onClick={() => navigateTo('/campaign-control')}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg"
        >
          <LayoutGrid className="w-5 h-5" />
          {t('homepage.actions.manage_campaigns')}
        </button>

        <button
          onClick={() => navigateTo('/ai-investigator')}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg"
        >
          <Sparkles className="w-5 h-5" />
          {t('homepage.actions.ask_ai')}
        </button>
      </div>
    </MainLayout2>
  );
}
