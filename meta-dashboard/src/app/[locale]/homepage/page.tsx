"use client";

/**
 * Homepage - Task-oriented homepage
 * Clean, friendly interface that helps users navigate to what they want to do
 */

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '../../../components/MainLayout';
import { useUser } from '../../../context/UserContext';
import { useAccount } from '../../../context/AccountContext';
import ActionCard from '../../../components/homepage/ActionCard';

// Icons
import {
  Sliders,
  BarChart3,
  TrendingUp,
  Sparkles,
  MessageCircle,
  FileText,
} from 'lucide-react';

// Services for hints
import { fetchCampaignsWithComparison } from '../../../services/campaigns.service';
import { formatDate, calculateDateRange } from '../../../utils/date';

export default function Homepage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { user } = useUser();
  const { selectedAccountId } = useAccount();

  // Fetch campaigns for hints
  const dateRange = useMemo(() => calculateDateRange('last_30_days'), []);
  const startDate = formatDate(dateRange.start) || '';
  const endDate = formatDate(dateRange.end) || '';

  const { data: campaigns } = useQuery({
    queryKey: ['homepage-campaigns', startDate, endDate, selectedAccountId],
    queryFn: () =>
      fetchCampaignsWithComparison(
        { startDate, endDate },
        [],
        '',
        'spend',
        'desc',
        selectedAccountId
      ),
    enabled: !!startDate && !!endDate && !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate hints
  const activeCampaigns = campaigns?.filter(c => c.campaign_status === 'ACTIVE').length || 0;
  const totalSpend = campaigns?.reduce((sum, c) => sum + (c.spend || 0), 0) || 0;
  const avgDailySpend = totalSpend / 30;

  // Get first name for greeting
  const firstName = user?.full_name?.split(' ')[0] || t('homepage3.default_name');

  // Navigation helper
  const navigateTo = (path: string) => {
    router.push(`/${locale}${path}`);
  };

  // Action cards configuration
  const actions = [
    {
      key: 'manage',
      icon: Sliders,
      gradient: 'from-blue-500 to-cyan-500',
      route: '/campaign-control',
      hint: activeCampaigns > 0 ? t('homepage3.manage.hint', { count: activeCampaigns }) : undefined,
    },
    {
      key: 'performance',
      icon: BarChart3,
      gradient: 'from-green-500 to-emerald-500',
      route: '/account-dashboard',
      hint: avgDailySpend > 0 ? t('homepage3.performance.hint', { amount: avgDailySpend.toFixed(0) }) : undefined,
    },
    {
      key: 'trends',
      icon: TrendingUp,
      gradient: 'from-purple-500 to-pink-500',
      route: '/insights',
      hint: t('homepage3.trends.hint'),
    },
    {
      key: 'ai_strategy',
      icon: Sparkles,
      gradient: 'from-orange-500 to-red-500',
      route: '/ai-investigator',
      hint: undefined,
    },
    {
      key: 'ask',
      icon: MessageCircle,
      gradient: 'from-indigo-500 to-violet-500',
      route: '/ai-investigator',
      hint: undefined,
    },
    {
      key: 'reports',
      icon: FileText,
      gradient: 'from-pink-500 to-rose-500',
      route: '/reports',
      hint: undefined,
    },
  ];

  return (
    <MainLayout title={t('homepage3.title')} description="">
      {/* Greeting */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
          {t('homepage3.greeting', { name: firstName })}
        </h1>
        <h2 className="text-xl md:text-2xl font-semibold text-white/90 mb-2">
          {t('homepage3.question')}
        </h2>
        <p className="text-gray-400 text-base">{t('homepage3.subtitle')}</p>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {actions.map(action => (
          <ActionCard
            key={action.key}
            icon={action.icon}
            title={t(`homepage3.${action.key}.title`)}
            description={t(`homepage3.${action.key}.description`)}
            hint={action.hint}
            gradient={action.gradient}
            onClick={() => navigateTo(action.route)}
          />
        ))}
      </div>
    </MainLayout>
  );
}
