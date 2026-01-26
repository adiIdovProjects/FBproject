"use client";

/**
 * GuidedActions Component
 * State-aware CTAs that guide users on what to do next
 */

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Card, Text } from '@tremor/react';
import {
  Rocket,
  Plus,
  BarChart3,
  MessageCircle,
  Wrench,
  Play,
  BookOpen,
  Eye,
} from 'lucide-react';

interface GuidedActionsProps {
  accountHealth: 'good' | 'attention' | 'issues' | 'new_user' | 'loading';
  onOpenChat: () => void;
  problemCampaignName?: string;
}

interface ActionItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  variant: 'primary' | 'secondary' | 'tertiary';
}

const GuidedActions: React.FC<GuidedActionsProps> = ({
  accountHealth,
  onOpenChat,
  problemCampaignName,
}) => {
  const t = useTranslations();
  const locale = useLocale();

  // Get actions based on account state
  const getActions = (): ActionItem[] => {
    switch (accountHealth) {
      case 'new_user':
        return [
          {
            label: t('homepage.guided_actions.create_first_campaign'),
            icon: Rocket,
            href: `/${locale}/uploader/wizard`,
            variant: 'primary',
          },
          {
            label: t('homepage.guided_actions.learn_facebook_ads'),
            icon: BookOpen,
            href: `/${locale}/learning`,
            variant: 'secondary',
          },
          {
            label: t('homepage.guided_actions.talk_to_eddie'),
            icon: MessageCircle,
            onClick: onOpenChat,
            variant: 'tertiary',
          },
        ];

      case 'issues':
      case 'attention':
        return [
          {
            label: problemCampaignName
              ? t('homepage.guided_actions.fix_campaign', { name: problemCampaignName })
              : t('homepage.guided_actions.fix_issues'),
            icon: Wrench,
            href: `/${locale}/uploader/add-creative`,
            variant: 'primary',
          },
          {
            label: t('homepage.guided_actions.ask_eddie_help'),
            icon: MessageCircle,
            onClick: onOpenChat,
            variant: 'secondary',
          },
          {
            label: t('homepage.guided_actions.see_all_campaigns'),
            icon: Eye,
            href: `/${locale}/campaigns`,
            variant: 'tertiary',
          },
        ];

      case 'good':
      default:
        return [
          {
            label: t('homepage.guided_actions.add_new_creative'),
            icon: Plus,
            href: `/${locale}/uploader/add-creative`,
            variant: 'primary',
          },
          {
            label: t('homepage.guided_actions.view_results'),
            icon: BarChart3,
            href: `/${locale}/account-dashboard`,
            variant: 'secondary',
          },
          {
            label: t('homepage.guided_actions.get_ai_analysis'),
            icon: MessageCircle,
            onClick: onOpenChat,
            variant: 'tertiary',
          },
        ];
    }
  };

  const actions = getActions();

  // Button styles by variant
  const variantStyles = {
    primary: 'bg-gradient-to-r from-accent to-purple-600 hover:from-accent/90 hover:to-purple-600/90 text-white shadow-lg shadow-accent/20',
    secondary: 'bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/20',
    tertiary: 'bg-transparent hover:bg-white/5 text-gray-300 hover:text-white border border-white/5 hover:border-white/10',
  };

  return (
    <Card className="card-gradient border-border-subtle h-full">
      <Text className="text-white font-bold text-lg mb-4">
        {t('homepage.guided_actions.title')}
      </Text>

      <div className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          const baseClass = `w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-all ${variantStyles[action.variant]}`;

          if (action.onClick) {
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={baseClass}
              >
                <Icon className="w-5 h-5" />
                <span>{action.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={index}
              href={action.href!}
              className={baseClass}
            >
              <Icon className="w-5 h-5" />
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Encouragement text */}
      <Text className="text-gray-500 text-xs text-center mt-4">
        {accountHealth === 'new_user'
          ? t('homepage.guided_actions.encouragement_new')
          : accountHealth === 'issues' || accountHealth === 'attention'
            ? t('homepage.guided_actions.encouragement_issues')
            : t('homepage.guided_actions.encouragement_good')
        }
      </Text>
    </Card>
  );
};

export default GuidedActions;
