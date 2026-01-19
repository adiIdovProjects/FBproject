/**
 * ComparisonTable Component
 * Displays period-to-period comparison data in a sortable table
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { ComparisonItem, MetricsPeriod } from '../../services/reports.service';
import { MetricKey } from './MetricPills';
import { InfoTooltip } from '../ui/InfoTooltip';

interface ComparisonTableProps {
  data: ComparisonItem[];
  selectedMetrics: MetricKey[];
  breakdown?: string;
  secondaryBreakdown?: string;
  tertiaryBreakdown?: string;
  currency?: string;
  isRTL?: boolean;
}

type SortKey = MetricKey | 'name' | 'primary' | 'secondary' | 'tertiary';
type SortDirection = 'asc' | 'desc';

export default function ComparisonTable({
  data,
  selectedMetrics,
  breakdown = 'none',
  secondaryBreakdown = 'none',
  tertiaryBreakdown = 'none',
  currency = 'USD',
  isRTL = false,
}: ComparisonTableProps) {
  const t = useTranslations();
  const locale = useLocale();

  // Check if we have multi-dimensional breakdown
  const hasSecondaryBreakdown = secondaryBreakdown !== 'none';
  const hasTertiaryBreakdown = tertiaryBreakdown !== 'none';

  const getBreakdownLabel = (type: string): string => {
    switch (type) {
      case 'campaign_name':
        return t('campaigns.campaign_name');
      case 'ad_set_name':
        return t('breakdown.ad_set_name');
      case 'ad_name':
        return t('breakdown.ad_name');
      case 'date':
        return t('reports.by_date');
      case 'week':
        return t('reports.by_week');
      case 'month':
        return t('reports.by_month');
      case 'placement':
        return t('breakdown.placement');
      case 'platform':
        return t('breakdown.platform');
      case 'age':
        return t('breakdown.age');
      case 'gender':
        return t('breakdown.gender');
      case 'country':
        return t('breakdown.country');
      default:
        return t('common.name');
    }
  };

  const getNameColumnLabel = (): string => {
    return getBreakdownLabel(breakdown);
  };

  // Get breakdown values from item - use new fields if available, fallback to name
  const getItemValues = (item: ComparisonItem): { primary: string; secondary: string; tertiary: string } => {
    // Use the new separate fields if available (from multi-dimensional breakdown)
    // Check if primary_value exists and is not empty
    if ('primary_value' in item && item.primary_value) {
      return {
        primary: item.primary_value,
        secondary: item.secondary_value || '',
        tertiary: item.tertiary_value || ''
      };
    }
    // Fallback to name for single-dimension breakdowns
    return { primary: item.name, secondary: '', tertiary: '' };
  };
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortKey === 'name' || sortKey === 'primary') {
        const aValues = getItemValues(a);
        const bValues = getItemValues(b);
        aValue = aValues.primary;
        bValue = bValues.primary;
      } else if (sortKey === 'secondary') {
        const aValues = getItemValues(a);
        const bValues = getItemValues(b);
        aValue = aValues.secondary;
        bValue = bValues.secondary;
      } else if (sortKey === 'tertiary') {
        const aValues = getItemValues(a);
        const bValues = getItemValues(b);
        aValue = aValues.tertiary;
        bValue = bValues.tertiary;
      } else {
        aValue = a.period1[sortKey as MetricKey];
        bValue = b.period1[sortKey as MetricKey];
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [data, sortKey, sortDirection, hasSecondaryBreakdown, hasTertiaryBreakdown]);

  const formatValue = (metric: MetricKey, value: number | null): string => {
    if (value === null || value === undefined) return '-';

    switch (metric) {
      case 'spend':
        return currency === 'ILS' ? `₪${Math.round(value).toLocaleString()}` :
          currency === 'EUR' ? `€${Math.round(value).toLocaleString()}` :
            currency === 'GBP' ? `£${Math.round(value).toLocaleString()}` :
              `$${Math.round(value).toLocaleString()}`;
      case 'cpc':
      case 'cpa':
        return currency === 'ILS' ? `₪${value.toFixed(1)}` :
          currency === 'EUR' ? `€${value.toFixed(1)}` :
            currency === 'GBP' ? `£${value.toFixed(1)}` :
              `$${value.toFixed(1)}`;
      case 'conversion_value':
        return currency === 'ILS' ? `₪${value.toFixed(2)}` :
          currency === 'EUR' ? `€${value.toFixed(2)}` :
            currency === 'GBP' ? `£${value.toFixed(2)}` :
              `$${value.toFixed(2)}`;
      case 'conversion_rate':
      case 'ctr':
        return `${value.toFixed(2)}%`;
      case 'roas':
        return `${value.toFixed(2)}x`;
      case 'impressions':
      case 'clicks':
      case 'conversions':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  const getChangeColor = (metric: MetricKey, changePct: number | null): string => {
    if (changePct === null || changePct === 0) return 'text-gray-400';

    // For cost metrics (CPC, CPA), negative is good
    const costMetrics: MetricKey[] = ['cpc', 'cpa'];
    const isPositiveGood = !costMetrics.includes(metric);

    if (isPositiveGood) {
      return changePct > 0 ? 'text-green-400' : 'text-red-400';
    } else {
      return changePct < 0 ? 'text-green-400' : 'text-red-400';
    }
  };

  // Map of English country names to ISO 3166-1 alpha-2 codes
  const countryToCode: Record<string, string> = {
    'United States': 'US', 'Israel': 'IL', 'Germany': 'DE', 'France': 'FR',
    'United Kingdom': 'GB', 'Canada': 'CA', 'Australia': 'AU', 'Spain': 'ES',
    'Italy': 'IT', 'Netherlands': 'NL', 'Brazil': 'BR', 'Mexico': 'MX',
    'Japan': 'JP', 'India': 'IN', 'South Korea': 'KR', 'China': 'CN',
  };

  // Translate a breakdown value based on its type
  const translateBreakdownValue = (value: string, breakdownType: string): string => {
    if (!value) return t('breakdown.values.unknown');

    // For country breakdown, use Intl.DisplayNames
    if (breakdownType === 'country') {
      const code = countryToCode[value];
      if (code) {
        try {
          const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
          return displayNames.of(code) || value;
        } catch {
          return value;
        }
      }
      return value;
    }

    // For gender breakdown (or age_gender with combined values like "65+ | female")
    if (breakdownType === 'gender' || breakdownType === 'age_gender' || breakdownType === 'age-gender') {
      // Handle combined age-gender format "65+ | female"
      if (value.includes(' | ')) {
        const [age, gender] = value.split(' | ');
        const genderKey = gender.toLowerCase();
        const genderTranslationKey = `breakdown.values.${genderKey}`;
        const translatedGender = t.has(genderTranslationKey) ? t(genderTranslationKey) : gender;
        return `${age} | ${translatedGender}`;
      }
      // Handle standalone gender value
      const key = value.toLowerCase();
      const translationKey = `breakdown.values.${key}`;
      return t.has(translationKey) ? t(translationKey) : value;
    }

    // For platform/placement breakdown
    if (breakdownType === 'platform' || breakdownType === 'placement') {
      const key = value.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
      const translationKey = `breakdown.values.${key}`;
      return t.has(translationKey) ? t(translationKey) : value;
    }

    return value;
  };

  const getMetricLabel = (metric: MetricKey): string => {
    const labels: Record<MetricKey, string> = {
      spend: t('metrics.spend'),
      impressions: t('metrics.impressions'),
      clicks: t('metrics.clicks'),
      ctr: t('metrics.ctr'),
      cpc: t('metrics.cpc'),
      conversions: t('metrics.conversions'),
      conversion_value: t('metrics.conversion_value'),
      roas: t('metrics.roas'),
      cpa: t('metrics.cpa'),
      conversion_rate: t('metrics.conversion_rate'),
    };
    return labels[metric];
  };

  if (selectedMetrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>{t('reports.no_metrics_selected')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-800/50">
            {/* Primary breakdown column */}
            <th
              onClick={() => handleSort('primary')}
              className="px-4 py-3 text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-700/50 transition-colors sticky left-0 bg-gray-800/50 z-10"
              style={{ textAlign: isRTL ? 'right' : 'left' }}
            >
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row'}`}>
                <span>{getNameColumnLabel()}</span>
                {(sortKey === 'name' || sortKey === 'primary') && (
                  sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                )}
              </div>
            </th>

            {/* Secondary breakdown column (if applicable) */}
            {hasSecondaryBreakdown && (
              <th
                onClick={() => handleSort('secondary')}
                className="px-4 py-3 text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-700/50 transition-colors"
                style={{ textAlign: isRTL ? 'right' : 'left' }}
              >
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row'}`}>
                  <span>{getBreakdownLabel(secondaryBreakdown)}</span>
                  {sortKey === 'secondary' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                  )}
                </div>
              </th>
            )}

            {/* Tertiary breakdown column (if applicable) */}
            {hasTertiaryBreakdown && (
              <th
                onClick={() => handleSort('tertiary')}
                className="px-4 py-3 text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-700/50 transition-colors"
                style={{ textAlign: isRTL ? 'right' : 'left' }}
              >
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row'}`}>
                  <span>{getBreakdownLabel(tertiaryBreakdown)}</span>
                  {sortKey === 'tertiary' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                  )}
                </div>
              </th>
            )}

            {/* Metric columns */}
            {selectedMetrics.map((metric) => (
              <React.Fragment key={metric}>
                {/* Metric header */}
                <th
                  onClick={() => handleSort(metric)}
                  className="px-4 py-3 text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-700/50 transition-colors text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <InfoTooltip tooltipKey={`metrics.${metric}_tooltip`} size="sm" />
                    <span>{getMetricLabel(metric)}</span>
                    {sortKey === metric && (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
              </React.Fragment>
            ))}
          </tr>
        </thead>

        <tbody>
          {sortedData.map((item, idx) => {
            const itemValues = getItemValues(item);
            return (
              <tr
                key={item.id}
                className={`
                  border-t border-gray-700 hover:bg-gray-800/30 transition-colors
                  ${idx % 2 === 0 ? 'bg-gray-900/20' : ''}
                `}
              >
                {/* Primary breakdown value */}
                <td
                  className="px-4 py-3 text-sm text-gray-200 font-medium sticky left-0 bg-inherit z-10"
                  style={{ textAlign: isRTL ? 'right' : 'left' }}
                >
                  {translateBreakdownValue(itemValues.primary, breakdown)}
                </td>

                {/* Secondary breakdown value (if applicable) */}
                {hasSecondaryBreakdown && (
                  <td
                    className="px-4 py-3 text-sm text-gray-300"
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {translateBreakdownValue(itemValues.secondary, secondaryBreakdown)}
                  </td>
                )}

                {/* Tertiary breakdown value (if applicable) */}
                {hasTertiaryBreakdown && (
                  <td
                    className="px-4 py-3 text-sm text-gray-300"
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {translateBreakdownValue(itemValues.tertiary, tertiaryBreakdown)}
                  </td>
                )}

                {/* Metrics */}
                {selectedMetrics.map((metric) => {
                  const period1Value = item.period1[metric];

                  return (
                    <td key={`${item.id}-${metric}`} className="px-4 py-3 text-sm text-gray-300 text-center">
                      {formatValue(metric, period1Value)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Empty state */}
      {sortedData.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>{t('reports.no_data')}</p>
        </div>
      )}
    </div>
  );
}
