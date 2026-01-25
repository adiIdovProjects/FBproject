"use client";

/**
 * ReportFilters Component
 * Breakdown dropdown selectors and text filters
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { ReportBreakdown } from '../../services/reports.service';

interface ReportFiltersProps {
  primaryBreakdown: ReportBreakdown;
  secondaryBreakdown: ReportBreakdown;
  campaignFilter: string;
  adSetFilter: string;
  adFilter: string;
  onPrimaryChange: (value: ReportBreakdown) => void;
  onSecondaryChange: (value: ReportBreakdown) => void;
  onCampaignFilterChange: (value: string) => void;
  onAdSetFilterChange: (value: string) => void;
  onAdFilterChange: (value: string) => void;
  isRTL?: boolean;
}

// All breakdown options
const BREAKDOWN_OPTIONS: { value: ReportBreakdown; labelKey: string }[] = [
  { value: 'none', labelKey: 'reports.breakdown.none' },
  { value: 'date', labelKey: 'reports.breakdown.date' },
  { value: 'week', labelKey: 'reports.breakdown.week' },
  { value: 'month', labelKey: 'reports.breakdown.month' },
  { value: 'campaign_name', labelKey: 'reports.breakdown.campaign' },
  { value: 'ad_set_name', labelKey: 'reports.breakdown.adset' },
  { value: 'ad_name', labelKey: 'reports.breakdown.ad' },
  { value: 'placement', labelKey: 'reports.breakdown.placement' },
  { value: 'platform', labelKey: 'reports.breakdown.platform' },
  { value: 'age', labelKey: 'reports.breakdown.age' },
  { value: 'gender', labelKey: 'reports.breakdown.gender' },
  { value: 'country', labelKey: 'reports.breakdown.country' },
];

// Primary-only options (excludes 'none')
const PRIMARY_OPTIONS = BREAKDOWN_OPTIONS.filter(opt => opt.value !== 'none');

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  primaryBreakdown,
  secondaryBreakdown,
  campaignFilter,
  adSetFilter,
  adFilter,
  onPrimaryChange,
  onSecondaryChange,
  onCampaignFilterChange,
  onAdSetFilterChange,
  onAdFilterChange,
  isRTL = false,
}) => {
  const t = useTranslations();

  return (
    <div className={`flex flex-col gap-4 ${isRTL ? 'text-right' : ''}`}>
      {/* Breakdown Selectors Row */}
      <div className={`flex flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Primary Breakdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
            {t('reports.primary_breakdown')}
          </label>
          <div className="relative">
            <select
              value={primaryBreakdown}
              onChange={(e) => onPrimaryChange(e.target.value as ReportBreakdown)}
              className="appearance-none bg-secondary/50 border border-border-subtle rounded-lg px-4 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:border-accent min-w-[180px]"
            >
              {PRIMARY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-card">
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>

        {/* Secondary Breakdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
            {t('reports.secondary_breakdown')}
          </label>
          <div className="relative">
            <select
              value={secondaryBreakdown}
              onChange={(e) => onSecondaryChange(e.target.value as ReportBreakdown)}
              className="appearance-none bg-secondary/50 border border-border-subtle rounded-lg px-4 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:border-accent min-w-[180px]"
            >
              {BREAKDOWN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-card">
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Text Filters Row */}
      <div className={`flex flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Campaign Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
            {t('reports.filter_campaign')}
          </label>
          <input
            type="text"
            value={campaignFilter}
            onChange={(e) => onCampaignFilterChange(e.target.value)}
            placeholder={t('reports.filter_placeholder')}
            className="bg-secondary/50 border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-text-disabled focus:outline-none focus:border-accent min-w-[180px]"
          />
        </div>

        {/* Ad Set Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
            {t('reports.filter_adset')}
          </label>
          <input
            type="text"
            value={adSetFilter}
            onChange={(e) => onAdSetFilterChange(e.target.value)}
            placeholder={t('reports.filter_placeholder')}
            className="bg-secondary/50 border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-text-disabled focus:outline-none focus:border-accent min-w-[180px]"
          />
        </div>

        {/* Ad Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
            {t('reports.filter_ad')}
          </label>
          <input
            type="text"
            value={adFilter}
            onChange={(e) => onAdFilterChange(e.target.value)}
            placeholder={t('reports.filter_placeholder')}
            className="bg-secondary/50 border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-text-disabled focus:outline-none focus:border-accent min-w-[180px]"
          />
        </div>
      </div>
    </div>
  );
};

export default ReportFilters;
