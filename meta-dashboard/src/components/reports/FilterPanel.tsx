/**
 * FilterPanel Component
 * Left sidebar with all filters for Reports page (Tableau-inspired)
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Filter, X } from 'lucide-react';
import MetricPills, { MetricKey } from './MetricPills';

export type DimensionType = 'overview' | 'campaign' | 'ad';
export type BreakdownType = 'none' | 'campaign_name' | 'ad_set_name' | 'ad_name' | 'date' | 'week' | 'month';

interface FilterPanelProps {
  // Date range
  period1Start: string;
  period1End: string;
  onPeriod1Change: (start: string, end: string) => void;

  // Dimension
  dimension: DimensionType;
  onDimensionChange: (dimension: DimensionType) => void;

  // Breakdown
  breakdown: BreakdownType;
  onBreakdownChange: (breakdown: BreakdownType) => void;

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

  // Actions
  onApply: () => void;
  onReset: () => void;

  // UI
  isOpen?: boolean;
  onToggle?: () => void;
  isRTL?: boolean;
  hasConversionValue?: boolean;
}

export default function FilterPanel({
  period1Start,
  period1End,
  onPeriod1Change,
  dimension,
  onDimensionChange,
  breakdown,
  onBreakdownChange,
  campaignFilter,
  adSetFilter,
  adFilter,
  onCampaignFilterChange,
  onAdSetFilterChange,
  onAdFilterChange,
  selectedMetrics,
  onMetricsChange,
  onApply,
  onReset,
  isOpen = true,
  onToggle,
  isRTL = false,
  hasConversionValue = true,
}: FilterPanelProps) {
  const t = useTranslations();

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
        p-6 space-y-6
        ${isRTL ? 'border-r-0 border-l' : ''}
      `}
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <Filter className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-gray-100">{t('filters_panel')}</h2>
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <label className={`block text-sm font-semibold text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('date')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={period1Start}
            onChange={(e) => onPeriod1Change(e.target.value, period1End)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={period1End}
            onChange={(e) => onPeriod1Change(period1Start, e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700"></div>

      {/* Breakdown Selector */}
      <div className="space-y-2">
        <label className={`block text-sm font-semibold text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('breakdown')}
        </label>
        <select
          value={breakdown}
          onChange={(e) => onBreakdownChange(e.target.value as BreakdownType)}
          className={`w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        >
          <option value="none">{t('overview')}</option>
          <option value="campaign_name">{t('by_campaign_name')}</option>
          <option value="ad_set_name">{t('by_ad_set_name')}</option>
          <option value="ad_name">{t('by_ad_name')}</option>
          <option value="date">{t('by_date')}</option>
          <option value="week">{t('by_week')}</option>
          <option value="month">{t('by_month')}</option>
        </select>
      </div>

      {/* Campaign Filter */}
      {(breakdown === 'campaign_name' || breakdown === 'ad_set_name' || breakdown === 'ad_name') && (
        <div className="space-y-2">
          <label className={`block text-sm font-semibold text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('campaign_filter')}
          </label>
          <input
            type="text"
            value={campaignFilter}
            onChange={(e) => onCampaignFilterChange(e.target.value)}
            placeholder={t('campaign_filter')}
            className={`w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isRTL ? 'text-right' : 'text-left'
            }`}
          />
        </div>
      )}

      {/* Ad Set Filter */}
      {(breakdown === 'ad_set_name' || breakdown === 'ad_name') && (
        <div className="space-y-2">
          <label className={`block text-sm font-semibold text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('ad_set_filter')}
          </label>
          <input
            type="text"
            value={adSetFilter}
            onChange={(e) => onAdSetFilterChange(e.target.value)}
            placeholder={t('ad_set_filter')}
            className={`w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isRTL ? 'text-right' : 'text-left'
            }`}
          />
        </div>
      )}

      {/* Ad Filter */}
      {breakdown === 'ad_name' && (
        <div className="space-y-2">
          <label className={`block text-sm font-semibold text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('ad_filter')}
          </label>
          <input
            type="text"
            value={adFilter}
            onChange={(e) => onAdFilterChange(e.target.value)}
            placeholder={t('ad_filter')}
            className={`w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isRTL ? 'text-right' : 'text-left'
            }`}
          />
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-700"></div>

      {/* Metrics Selector */}
      <MetricPills
        selectedMetrics={selectedMetrics}
        onMetricsChange={onMetricsChange}
        isRTL={isRTL}
        hasConversionValue={hasConversionValue}
      />

      {/* Divider */}
      <div className="border-t border-gray-700"></div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onApply}
          disabled={selectedMetrics.length === 0}
          className={`
            flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed
            text-white font-semibold py-2 px-4 rounded
            transition-colors
          `}
        >
          {t('apply_filters')}
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded transition-colors"
        >
          {t('reset_filters')}
        </button>
      </div>
    </div>
  );
}
