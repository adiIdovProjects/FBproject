"use client";

/**
 * ActionPanel Component
 * Three main action buttons: Create Campaign, Analyze Results, Talk to AI
 */

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Card, Text } from '@tremor/react';
import { Rocket, BarChart3, MessageCircle } from 'lucide-react';

interface ActionPanelProps {
  onOpenChat: () => void;
}

const ActionPanel: React.FC<ActionPanelProps> = ({ onOpenChat }) => {
  const t = useTranslations();
  const locale = useLocale();

  const actions = [
    {
      label: t('homepage.actions.create_campaign'),
      icon: Rocket,
      href: `/${locale}/uploader/wizard`,
      color: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400',
      isButton: false,
    },
    {
      label: t('homepage.actions.analyze_results'),
      icon: BarChart3,
      href: `/${locale}/account-dashboard`,
      color: 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400',
      isButton: false,
    },
    {
      label: t('homepage.actions.talk_to_ai'),
      icon: MessageCircle,
      onClick: onOpenChat,
      color: 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400',
      isButton: true,
    },
  ];

  return (
    <Card className="card-gradient border-border-subtle">
      <Text className="text-foreground font-bold text-lg mb-4">
        {t('homepage.actions.title')}
      </Text>

      <div className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon;

          if (action.isButton) {
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${action.color} text-white font-semibold transition-all shadow-lg hover:shadow-xl`}
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
              className={`flex items-center gap-3 px-4 py-3 rounded-xl ${action.color} text-white font-semibold transition-all shadow-lg hover:shadow-xl`}
            >
              <Icon className="w-5 h-5" />
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
};

export default ActionPanel;
