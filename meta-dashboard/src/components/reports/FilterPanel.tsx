/**
 * FilterPanel Component
 * Click-to-build report builder with chip-based selection
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Filter, Minus, Plus, RotateCcw, Target, Layers, FileText, Calendar, CalendarDays, CalendarRange, Layout, Users, Globe } from 'lucide-react';
import MetricPills, { MetricKey } from './MetricPills';

export type DimensionType = 'overview' | 'campaign' | 'ad';
export type BreakdownType = 'none' | 'campaign_name' | 'ad_set_name' | 'ad_name' | 'date' | 'week' | 'month' | 'placement' | 'platform' | 'age' | 'gender' | 'country';

// Breakdown categories
const ENTITY_BREAKDOWNS: BreakdownType[] = ['campaign_name', 'ad_set_name', 'ad_name'];
const TIME_BREAKDOWNS: BreakdownType[] = ['date', 'week', 'month'];
const SPECIAL_BREAKDOWNS: BreakdownType[] = ['placement', 'platform', 'age', 'gender', 'country'];

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
  'age': { labelKey: 'reports.builder.age', icon: <Users className="w-4 h-4" /> },
  'gender': { labelKey: 'reports.builder.gender', icon: <Users className="w-4 h-4" /> },
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

  // Tertiary Breakdown (for 3-dimensional reports)
  tertiaryBreakdown?: BreakdownType;
  onTertiaryBreakdownChange?: (breakdown: BreakdownType) => void;

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
  tertiaryBreakdown = 'none',
  onTertiaryBreakdownChange,
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

  // Check if any breakdown is a special type (used for hiding conversion metrics)
  const hasSpecialBreakdown = SPECIAL_BREAKDOWNS.includes(breakdown) ||
    SPECIAL_BREAKDOWNS.includes(secondaryBreakdown) ||
    SPECIAL_BREAKDOWNS.includes(tertiaryBreakdown);

  // Get category of a breakdown
  const getCategory = (b: BreakdownType): 'entity' | 'time' | 'special' | 'none' => {
    if (b === 'none') return 'none';
    if (ENTITY_BREAKDOWNS.includes(b)) return 'entity';
    if (TIME_BREAKDOWNS.includes(b)) return 'time';
    if (SPECIAL_BREAKDOWNS.includes(b)) return 'special';
    return 'none';
  };

  // Get currently selected categories
  const getSelectedCategories = (): Set<string> => {
    const cats = new Set<string>();
    if (breakdown !== 'none') cats.add(getCategory(breakdown));
    if (secondaryBreakdown !== 'none') cats.add(getCategory(secondaryBreakdown));
    if (tertiaryBreakdown !== 'none') cats.add(getCategory(tertiaryBreakdown));
    return cats;
  };

  // Check if a value can be added as next selection
  const canAddAsNext = (value: BreakdownType): boolean => {
    const valueCategory = getCategory(value);
    const selectedCats = getSelectedCategories();

    // Can't select same item twice
    if (value === breakdown || value === secondaryBreakdown || value === tertiaryBreakdown) return false;

    // Can't select from same category twice
    if (selectedCats.has(valueCategory)) return false;

    // Max 3 selections
    if (selectedCats.size >= 3) return false;

    // Valid combination: Entity + Time + Special (any order)
    return true;
  };

  // Build summary text
  const getSummary = (): string => {
    if (breakdown === 'none') return '';

    const primaryLabel = t(BREAKDOWN_CONFIG[breakdown].labelKey);
    if (secondaryBreakdown === 'none') return primaryLabel;

    const secondaryLabel = t(BREAKDOWN_CONFIG[secondaryBreakdown].labelKey);
    if (tertiaryBreakdown === 'none') return `${primaryLabel} × ${secondaryLabel}`;

    const tertiaryLabel = t(BREAKDOWN_CONFIG[tertiaryBreakdown].labelKey);
    return `${primaryLabel} × ${secondaryLabel} × ${tertiaryLabel}`;
  };

  // Handle chip click - supports up to 3 selections
  const handleChipClick = (value: BreakdownType) => {
    // If clicking on the current primary, deselect all
    if (breakdown === value) {
      onBreakdownChange('none');
      onSecondaryBreakdownChange('none');
      onTertiaryBreakdownChange?.('none');
      return;
    }

    // If clicking on the current secondary, deselect secondary and tertiary
    if (secondaryBreakdown === value) {
      onSecondaryBreakdownChange('none');
      onTertiaryBreakdownChange?.('none');
      return;
    }

    // If clicking on the current tertiary, deselect only tertiary
    if (tertiaryBreakdown === value) {
      onTertiaryBreakdownChange?.('none');
      return;
    }

    // If no primary selected, set as primary
    if (breakdown === 'none') {
      onBreakdownChange(value);
      return;
    }

    // Check if can add as next selection
    if (canAddAsNext(value)) {
      if (secondaryBreakdown === 'none') {
        onSecondaryBreakdownChange(value);
      } else if (tertiaryBreakdown === 'none' && onTertiaryBreakdownChange) {
        onTertiaryBreakdownChange(value);
      }
      return;
    }

    // Not compatible - replace primary and clear others
    onBreakdownChange(value);
    onSecondaryBreakdownChange('none');
    onTertiaryBreakdownChange?.('none');
  };

  // Handle clear
  const handleClear = () => {
    onBreakdownChange('none');
    onSecondaryBreakdownChange('none');
    onTertiaryBreakdownChange?.('none');
    onCampaignFilterChange('');
    onAdSetFilterChange('');
    onAdFilterChange('');
  };

  // Chip component with primary/secondary/tertiary styling
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
    const isTertiary = tertiaryBreakdown === value;

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
              : isTertiary
                ? 'bg-purple-500/30 text-purple-300 border-purple-500/50 shadow-sm'
                : 'bg-secondary/60 text-foreground border-border-subtle hover:bg-secondary hover:border-border-subtle'
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
      <div
        className={`
          bg-card-bg/40 border-r border-border-subtle
          h-full
          p-5
          ${isRTL ? 'border-r-0 border-l' : ''}
        `}
      >
        {/* Collapsed Header - just Plus button */}
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Filter className="w-5 h-5 text-blue-400" />
          </div>
          {onToggle && (
            <button onClick={onToggle} className="text-text-muted hover:text-foreground transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
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
          <h2 className="text-lg font-bold text-foreground">{t('reports.builder.title')}</h2>
        </div>
        {onToggle && (
          <button onClick={onToggle} className="text-text-muted hover:text-foreground transition-colors">
            <Minus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Section 1: Entity Selection */}
      <div className="space-y-3">
        <label className={`block text-xs font-semibold text-text-muted uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
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
        <label className={`block text-xs font-semibold text-text-muted uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
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
        <label className={`block text-xs font-semibold text-text-muted uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('reports.builder.audience')}
        </label>
        <div className="flex flex-wrap gap-2">
          <Chip value="placement">{t('reports.builder.placement')}</Chip>
          <Chip value="platform">{t('reports.builder.platform')}</Chip>
          <Chip value="age">{t('reports.builder.age')}</Chip>
          <Chip value="gender">{t('reports.builder.gender')}</Chip>
          <Chip value="country">{t('reports.builder.country')}</Chip>
        </div>
        <p className="text-[10px] text-text-muted">{t('breakdown.no_conversion_data')}</p>
      </div>

      {/* Section 5: Current Selection Summary */}
      <div className="border-t border-border-subtle/50"></div>
      <div className="p-4 bg-secondary/40 rounded-xl space-y-3">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-sm font-medium text-blue-400">{getSummary()}</span>
          {breakdown !== 'none' && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-foreground transition-colors"
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
            className={`w-full bg-card/50 border border-border-subtle rounded-lg px-3 py-2 text-sm text-foreground placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        )}
        {showAdSetFilter && (
          <input
            type="text"
            value={adSetFilter}
            onChange={(e) => onAdSetFilterChange(e.target.value)}
            placeholder={t('reports.builder.filter_adset')}
            className={`w-full bg-card/50 border border-border-subtle rounded-lg px-3 py-2 text-sm text-foreground placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        )}
        {showAdFilter && (
          <input
            type="text"
            value={adFilter}
            onChange={(e) => onAdFilterChange(e.target.value)}
            placeholder={t('reports.builder.filter_ad')}
            className={`w-full bg-card/50 border border-border-subtle rounded-lg px-3 py-2 text-sm text-foreground placeholder-text-disabled focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        )}
      </div>
    </div>
  );
}
