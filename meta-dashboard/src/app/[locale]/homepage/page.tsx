"use client";

/**
 * Homepage - Simple 6-box action menu for beginners
 * No data, no AI - just navigation options
 */

import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Sparkles,
  GraduationCap,
  PlusCircle,
  Lightbulb,
  MessageSquare
} from 'lucide-react';
import { MainLayout2 } from '../../../components/MainLayout2';
import { useUser } from '../../../context/UserContext';
import ActionCard from '../../../components/homepage/ActionCard';

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

  // Get first name for greeting
  const firstName = user?.full_name?.split(' ')[0] || t('homepage3.default_name');

  const navigateTo = (path: string) => {
    router.push(`/${locale}${path}`);
  };

  const actions = [
    {
      icon: LayoutGrid,
      title: t('homepage.actions.manage_campaigns'),
      description: t('homepage.box_descriptions.manage_campaigns') || 'View and control your campaigns',
      gradient: 'from-blue-500 to-cyan-500',
      onClick: () => navigateTo('/campaign-control'),
    },
    {
      icon: PlusCircle,
      title: t('homepage.actions.create_campaign'),
      description: t('homepage.box_descriptions.create_campaign') || 'Create a new campaign with AI',
      gradient: 'from-amber-500 to-orange-500',
      onClick: () => navigateTo('/campaign-control?tab=create'),
    },
    {
      icon: Lightbulb,
      title: t('campaign_control.tab_insights') || 'Insights',
      description: t('homepage.box_descriptions.insights') || 'Get AI-powered insights',
      gradient: 'from-purple-500 to-pink-500',
      onClick: () => navigateTo('/campaign-control?tab=insights'),
    },
    {
      icon: MessageSquare,
      title: t('homepage.actions.ask_ai'),
      description: t('homepage.box_descriptions.ask_ai') || 'Ask questions about your ads',
      gradient: 'from-cyan-500 to-teal-500',
      onClick: () => navigateTo('/ai-investigator'),
    },
    {
      icon: GraduationCap,
      title: t('homepage.actions.learn'),
      description: t('homepage.box_descriptions.learn') || 'Learn how Facebook Ads work',
      gradient: 'from-green-500 to-emerald-500',
      onClick: () => navigateTo('/learning'),
    },
    {
      icon: Sparkles,
      title: t('campaign_control.tab_ai_chat') || 'Ask AI',
      description: t('homepage.box_descriptions.chat') || 'Chat with your AI assistant',
      gradient: 'from-indigo-500 to-violet-500',
      onClick: () => navigateTo('/campaign-control?tab=ai-chat'),
    },
  ];

  return (
    <MainLayout2 title={t('homepage3.title')} description="" compact>
      {/* Greeting */}
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          {t('homepage3.greeting', { name: firstName })}
        </h1>
        <p className="text-gray-400 text-sm">{t('homepage3.subtitle')}</p>
      </div>

      {/* 6 Action Boxes - 2x3 grid */}
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action, index) => (
            <ActionCard
              key={index}
              icon={action.icon}
              title={action.title}
              description={action.description}
              gradient={action.gradient}
              onClick={action.onClick}
            />
          ))}
        </div>
      </div>
    </MainLayout2>
  );
}
