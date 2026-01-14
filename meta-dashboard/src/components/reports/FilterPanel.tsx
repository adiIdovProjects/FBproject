/**
 * FilterPanel Component
 * Click-to-build report builder with chip-based selection
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Filter, X, RotateCcw, Target, Layers, FileText, Calendar, CalendarDays, CalendarRange, Layout, Users, Globe } from 'lucide-react';
import MetricPills, { MetricKey } from './MetricPills';

export type DimensionType = 'overview' | 'campaign' | 'ad';
export type BreakdownType = 'none' | 'campaign_name' | 'ad_set_name' | 'ad_name' | 'date' | 'week' | 'month' | 'placement' | 'platform' | 'age-gender' | 'country';

// Breakdown categories
const ENTITY_BREAKDOWNS: BreakdownType[] = ['campaign_name', 'ad_set_name', 'ad_name'];
const TIME_BREAKDOWNS: BreakdownType[] = ['date', 'week', 'month'];
const SPECIAL_BREAKDOWNS: BreakdownType[] = ['placement', 'platform', 'age-gender', 'country'];

// Labels for breakdowns
const BREAKDOWN_CONFIG: Record<BreakdownType, { labelKey: string; icon: React.ReactNode }> = {
  'none': { labelKey: 'reports.overview', icon: <FileText className="w-4 h-4" /> },
  'campaign_name': { labelKey: 'reports.builder.campaign', icon: <Target className="w-4 h-4" /> },
  'ad_set_name': { labelKey: 'reports.builder.adset', icon: <Layers className="w-4 h-4" /> },
  'ad_name': { labelKey: 'reports.builder.ad', icon: <FileText className="w-4 h-4" /> },
  'date': { labelKey: 'reports.builder.day', icon: <Calendar className="w-4 h-4" /> },
  'week': { labelKey: 'reports.builder.week', icon: <CalendarDays className="w-4 h-4" /> },
  'month': { labelKey: 'reports.builder.month', icon: <CalendarRange className="w-4 h-4" /> },
  'placement': { labelKey: 'reports.builder.placement', icon: <Layout className="w-4 h-4" /> },
  'platform': { labelKey: 'reports.builder.platform', icon: <Layout className="w-4 h-4" /> },
  'age-gender': { labelKey: 'reports.builder.demographics', icon: <Users className="w-4 h-4" /> },
  'country': { labelKey: 'reports.builder.country', icon: <Globe className="w-4 h-4" /> },
};

interface FilterPanelProps {
  // Date range
  period1Start: string;
  period1End: string;
  onPeriod1Change?: (start: string, end: string) => void;

  // Dimension
  dimension: DimensionType;
  onDimensionChange: (dimension: DimensionType) => void;

  // Breakdown
  breakdown: BreakdownType;
  onBreakdownChange: (breakdown: BreakdownType) => void;

  // Secondary Breakdown
  secondaryBreakdown: BreakdownType;
  onSecondaryBreakdownChange: (breakdown: BreakdownType) => void;

  // Filters
  campaignFilter: string;
  adSetFilter: string;
  adFilter: string;
  onCampaignFilterChange: (value: string) => void;
  onAdSetFilterChange: (value: string) => void;
  onAdFilterChange: (value: string) => void;

  // Metrics
  selectedMetrics: MetricKey[];
  onMetricsChange: (metrics: MetricKey[]) => void;

  // UI
  isOpen?: boolean;
  onToggle?: () => void;
  isRTL?: boolean;
  hasConversionValue?: boolean;
}

export default function FilterPanel({
  breakdown,
  onBreakdownChange,
  secondaryBreakdown,
  onSecondaryBreakdownChange,
  campaignFilter,
  adSetFilter,
  adFilter,
  onCampaignFilterChange,
  onAdSetFilterChange,
  onAdFilterChange,
  selectedMetrics,
  onMetricsChange,
  isOpen = true,
  onToggle,
  isRTL = false,
  hasConversionValue = true,
}: FilterPanelProps) {
  const t = useTranslations();

  // Check if primary breakdown is a special type (used for UI logic)
  const isPrimarySpecial = SPECIAL_BREAKDOWNS.includes(breakdown);
  // Check if either breakdown is special (used for hiding conversion metrics)
  const hasSpecialBreakdown = isPrimarySpecial || SPECIAL_BREAKDOWNS.includes(secondaryBreakdown);

  // Check if two breakdowns are compatible for combination
  const areCompatible = (primary: BreakdownType, secondary: BreakdownType): boolean => {
    if (primary === 'none' || secondary === 'none') return false;
    if (primary === secondary) return false;
    // Entity + Time is always valid
    if (ENTITY_BREAKDOWNS.includes(primary) && TIME_BREAKDOWNS.includes(secondary)) return true;
    if (TIME_BREAKDOWNS.includes(primary) && ENTITY_BREAKDOWNS.includes(secondary)) return true;
    // Entity + Special is valid
    if (ENTITY_BREAKDOWNS.includes(primary) && SPECIAL_BREAKDOWNS.includes(secondary)) return true;
    // Special as primary cannot have secondary
    return false;
  };

  // Build summary text
  const getSummary = (): string => {
    if (breakdown === 'none') return t('reports.builder.select_above');

    const primaryLabel = t(BREAKDOWN_CONFIG[breakdown].labelKey);
    if (secondaryBreakdown === 'none') return primaryLabel;

    const secondaryLabel = t(BREAKDOWN_CONFIG[secondaryBreakdown].labelKey);
    return `${primaryLabel} × ${secondaryLabel}`;
  };

  // Handle chip click - first click = primary, second click = secondary (if compatible)
  const handleChipClick = (value: BreakdownType) => {
    console.log('[FilterPanel] handleChipClick:', value, 'current primary:', breakdown, 'current secondary:', secondaryBreakdown);

    // If clicking on the current primary, deselect it
    if (breakdown === value) {
      console.log('[FilterPanel] Deselecting primary');
      onBreakdownChange('none');
      onSecondaryBreakdownChange('none');
      return;
    }

    // If clicking on the current secondary, deselect it
    if (secondaryBreakdown === value) {
      console.log('[FilterPanel] Deselecting secondary');
      onSecondaryBreakdownChange('none');
      return;
    }

    // If no primary selected, set as primary
    if (breakdown === 'none') {
      console.log('[FilterPanel] Setting as primary:', value);
      onBreakdownChange(value);
      return;
    }

    // Primary is selected - check if this can be secondary
    const compatible = areCompatible(breakdown, value);
    console.log('[FilterPanel] areCompatible(' + breakdown + ', ' + value + ') =', compatible);

    if (compatible) {
      console.log('[FilterPanel] Setting as secondary:', value);
      onSecondaryBreakdownChange(value);
      return;
    }

    // Not compatible as secondary - replace primary and clear secondary
    console.log('[FilterPanel] Replacing primary with:', value);
    onBreakdownChange(value);
    onSecondaryBreakdownChange('none');
  };

  // Handle clear
  const handleClear = () => {
    onBreakdownChange('none');
    onSecondaryBreakdownChange('none');
    onCampaignFilterChange('');
    onAdSetFilterChange('');
    onAdFilterChange('');
  };

  // Chip component with primary/secondary styling
  const Chip = ({
    value,
    children,
  }: {
    value: BreakdownType;
    children: React.ReactNode;
  }) => {
    const config = BREAKDOWN_CONFIG[value];
    const isPrimary = breakdown === value;
    const isSecondary = secondaryBreakdown === value;

    return (
      <button
        onClick={() => handleChipClick(value)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 border
          ${isPrimary
            ? 'bg-blue-600 text-white border-blue-500 shadow-md'
            : isSecondary
              ? 'bg-blue-500/30 text-blue-300 border-blue-500/50 shadow-sm'
              : 'bg-gray-800/60 text-gray-300 border-gray-700 hover:bg-gray-700 hover:border-gray-600'
          }
        `}
      >
        {config.icon}
        <span>{children}</span>
      </button>
    );
  };

  // Show filter inputs based on breakdown type
  const showCampaignFilter = ENTITY_BREAKDOWNS.includes(breakdown) ||
    (TIME_BREAKDOWNS.includes(breakdown) && ENTITY_BREAKDOWNS.includes(secondaryBreakdown));
  const showAdSetFilter = breakdown === 'ad_set_name' || breakdown === 'ad_name' ||
    secondaryBreakdown === 'ad_set_name' || secondaryBreakdown === 'ad_name';
  const showAdFilter = breakdown === 'ad_name' || secondaryBreakdown === 'ad_name';

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-1/2 -translate-y-1/2 bg-card-bg border border-border-subtle rounded-r-lg p-2 hover:bg-gray-800 transition-colors z-10"
      >
        <Filter className="w-5 h-5 text-gray-400" />
      </button>
    );
  }

  return (
    <div
      className={`
        bg-card-bg/40 border-r border-border-subtle
        w-80 h-full overflow-y-auto
        p-5 space-y-5
        ${isRTL ? 'border-r-0 border-l' : ''}
      `}
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <Filter className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-gray-100">{t('reports.builder.title')}</h2>
        </div>
        {onToggle && (
          <button onClick={onToggle} className="text-gray-400 hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Section 1: Entity Selection */}
      <div className="space-y-3">
        <label className={`block text-xs font-semibold text-gray-400 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('reports.builder.analyze_by')}
        </label>
        <div className="flex flex-wrap gap-2">
          <Chip value="campaign_name">{t('reports.builder.campaign')}</Chip>
          <Chip value="ad_set_name">{t('reports.builder.adset')}</Chip>
          <Chip value="ad_name">{t('reports.builder.ad')}</Chip>
        </div>
      </div>

      {/* Section 2: Time Selection */}
      <div className="space-y-3">
        <label className={`block text-xs font-semibold text-gray-400 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('reports.builder.by_time')}
        </label>
        <div className="flex flex-wrap gap-2">
          <Chip value="date">{t('reports.builder.day')}</Chip>
          <Chip value="week">{t('reports.builder.week')}</Chip>
          <Chip value="month">{t('reports.builder.month')}</Chip>
        </div>
      </div>

      {/* Section 3: Audience Insights (Special) */}
      <div className="space-y-3">
        <label className={`block text-xs font-semibold text-gray-400 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('reports.builder.audience')}
        </label>
        <div className="flex flex-wrap gap-2">
          <Chip value="placement">{t('reports.builder.placement')}</Chip>
          <Chip value="age-gender">{t('reports.builder.demographics')}</Chip>
          <Chip value="country">{t('reports.builder.country')}</Chip>
        </div>
      </div>

      {/* Section 5: Current Selection Summary */}
      <div className="border-t border-gray-700/50"></div>
      <div className="p-4 bg-gray-800/40 rounded-xl space-y-3">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-sm font-medium text-blue-400">{getSummary()}</span>
          {breakdown !== 'none' && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              {t('reports.builder.clear')}
            </button>
          )}
        </div>

        {/* Contextual filter inputs */}
        {showCampaignFilter && (
          <input
            type="text"
            value={campaignFilter}
            onChange={(e) => onCampaignFilterChange(e.target.value)}
            placeholder={t('reports.builder.filter_campaign')}
            className={`w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        )}
        {showAdSetFilter && (
          <input
            type="text"
            value={adSetFilter}
            onChange={(e) => onAdSetFilterChange(e.target.value)}
            placeholder={t('reports.builder.filter_adset')}
            className={`w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        )}
        {showAdFilter && (
          <input
            type="text"
            value={adFilter}
            onChange={(e) => onAdFilterChange(e.target.value)}
            placeholder={t('reports.builder.filter_ad')}
            className={`w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        )}
      </div>

      {/* Section 6: Metrics */}
      <div className="border-t border-gray-700/50"></div>
      <MetricPills
        selectedMetrics={selectedMetrics}
        onMetricsChange={onMetricsChange}
        isRTL={isRTL}
        hasConversionValue={hasConversionValue}
        isSpecialBreakdown={hasSpecialBreakdown}
      />
    </div>
  );
}
