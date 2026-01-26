"use client";

/**
 * CapabilitiesShowcase Component
 * Subtle feature discovery - "Did you know Eddie can..."
 */

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Card, Text } from '@tremor/react';
import {
  Clock,
  DollarSign,
  Image,
  Bell,
  TrendingUp,
  Brain,
  ChevronRight,
} from 'lucide-react';

interface CapabilitiesShowcaseProps {
  className?: string;
}

const capabilities = [
  {
    key: 'monitoring',
    icon: Clock,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    key: 'budget',
    icon: DollarSign,
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    key: 'creatives',
    icon: Image,
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    key: 'alerts',
    icon: Bell,
    gradient: 'from-orange-500 to-red-500',
  },
  {
    key: 'trends',
    icon: TrendingUp,
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    key: 'insights',
    icon: Brain,
    gradient: 'from-pink-500 to-rose-500',
  },
];

const CapabilitiesShowcase: React.FC<CapabilitiesShowcaseProps> = ({ className }) => {
  const t = useTranslations();
  const locale = useLocale();

  // Show 3 random capabilities (or first 3 for consistency)
  const displayedCapabilities = capabilities.slice(0, 3);

  return (
    <Card className={`card-gradient border-border-subtle ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <Text className="text-white font-bold text-lg">
          {t('homepage.capabilities.title')}
        </Text>
        <Link
          href={`/${locale}/learning`}
          className="text-accent text-sm hover:underline flex items-center gap-1 shrink-0"
        >
          {t('homepage.capabilities.see_all')}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {displayedCapabilities.map(({ key, icon: Icon, gradient }) => (
          <div
            key={key}
            className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-accent/20 transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <Text className="text-white font-medium text-sm mb-1">
              {t(`homepage.capabilities.${key}`)}
            </Text>
            <Text className="text-gray-400 text-xs">
              {t(`homepage.capabilities.${key}_desc`)}
            </Text>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default CapabilitiesShowcase;
