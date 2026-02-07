"use client";

/**
 * Homepage - Performance Dashboard
 * Shows KPIs, weekly chart, and budget tracker
 */

import { useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { MainLayout } from '../../../components/MainLayout';
import { useUser } from '../../../context/UserContext';
import BudgetTrackerCard from '../../../components/homepage/BudgetTrackerCard';
import DashboardKPICards from '../../../components/homepage/DashboardKPICards';
import WeeklyPerformanceChart from '../../../components/homepage/WeeklyPerformanceChart';
import GettingStartedCard from '../../../components/homepage/GettingStartedCard';
import TipsCard from '../../../components/homepage/TipsCard';
import OnboardingTour from '../../../components/onboarding/OnboardingTour';

export default function Homepage() {
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

  // Get last 7 days date range
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, []);

  const handleCreateAd = () => {
    router.push(`/${locale}/uploader/ai-captain`);
  };

  return (
    <MainLayout
      title={t('dashboard.performance_dashboard') || 'Performance Dashboard'}
      description={t('dashboard.subtitle') || 'Monitor your advertising performance in real-time'}
      compact
    >
      {/* Onboarding Tour for first-time users */}
      <OnboardingTour />

      {/* Create New Ad Button */}
      <div className="flex justify-end mb-6 -mt-2">
        <button
          onClick={handleCreateAd}
          data-tour="create-campaign"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
        >
          <Sparkles className="w-4 h-4" />
          {t('dashboard.create_new_ad') || 'Create New Ad'}
        </button>
      </div>

      {/* Getting Started Card (for new users) */}
      <div className="mb-6">
        <GettingStartedCard locale={locale} />
      </div>

      {/* KPI Cards */}
      <div className="mb-6" data-tour="kpi-cards">
        <DashboardKPICards startDate={startDate} endDate={endDate} />
      </div>

      {/* Chart + Budget Tracker + Tips Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Weekly Performance Chart - Takes 3 columns */}
        <div className="lg:col-span-3">
          <WeeklyPerformanceChart startDate={startDate} endDate={endDate} />
        </div>

        {/* Budget Tracker - Takes 2 columns */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <BudgetTrackerCard />
          <TipsCard />
        </div>
      </div>
    </MainLayout>
  );
}
