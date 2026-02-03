"use client";

/**
 * Campaigns2 - Simplified campaigns view
 * Shows Name, Spend, Conversions, CPA, Status toggle
 */

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MainLayout2 } from '../../../components/MainLayout2';
import SimpleCampaignList from '../../../components/campaigns/SimpleCampaignList';

type DateRangeType = 'last_7_days' | 'last_14_days' | 'last_30_days';

export default function Campaigns2() {
  const t = useTranslations();
  const locale = useLocale();
  const [dateRange, setDateRange] = useState<DateRangeType>('last_7_days');

  const dateRangeOptions = [
    { value: 'last_7_days', label: t('campaigns2.last_7_days') },
    { value: 'last_14_days', label: t('campaigns2.last_14_days') },
    { value: 'last_30_days', label: t('campaigns2.last_30_days') },
  ];

  return (
    <MainLayout2 title={t('campaigns2.title')} description={t('campaigns2.description')} compact>
      {/* Date Range Selector */}
      <div className="flex justify-end mb-4">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRangeType)}
          className="bg-card border border-border-subtle rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {dateRangeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Campaign List */}
      <SimpleCampaignList dateRange={dateRange} />
    </MainLayout2>
  );
}
