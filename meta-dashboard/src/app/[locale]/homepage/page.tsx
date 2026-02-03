"use client";

/**
 * Homepage - Simplified homepage with KPI cards and date filter
 * Uses MainLayout2 (top nav) similar to homepage2
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MainLayout2 } from '../../../components/MainLayout2';
import { useUser } from '../../../context/UserContext';
import DateFilter from '../../../components/DateFilter';
import HomepageKPICards from '../../../components/homepage/HomepageKPICards';
import { formatDate, calculateDateRange } from '../../../utils/date';

export default function Homepage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();

  // Default to last 7 days
  const initialDates = useMemo(() => calculateDateRange('last_7_days'), []);
  const [startDate, setStartDate] = useState<string | null>(formatDate(initialDates.start));
  const [endDate, setEndDate] = useState<string | null>(formatDate(initialDates.end));

  // Redirect to connect Facebook if user hasn't connected yet
  useEffect(() => {
    if (!isUserLoading && user && !user.facebook_id) {
      router.replace(`/${locale}/onboard/connect-facebook`);
    }
  }, [user, isUserLoading, router, locale]);

  // Handle date range changes from DateFilter
  const handleDateRangeChange = useCallback((newStartDate: string | null, newEndDate: string | null) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }, []);

  // Get first name for greeting
  const firstName = user?.full_name?.split(' ')[0] || t('homepage3.default_name');

  return (
    <MainLayout2 title={t('homepage3.title')} description="" compact>
      {/* Greeting */}
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          {t('homepage3.greeting', { name: firstName })}
        </h1>
        <h2 className="text-lg md:text-xl font-semibold text-white/90 mb-1">
          {t('homepage3.question')}
        </h2>
        <p className="text-gray-400 text-sm">{t('homepage3.subtitle')}</p>
      </div>

      {/* Date Filter */}
      <div className="flex justify-center mb-6">
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      {/* KPI Cards */}
      <div className="max-w-4xl mx-auto">
        <HomepageKPICards
          startDate={startDate}
          endDate={endDate}
          locale={locale}
        />
      </div>
    </MainLayout2>
  );
}
