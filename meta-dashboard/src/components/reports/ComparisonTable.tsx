/**
 * ComparisonTable Component
 * Displays period-to-period comparison data in a sortable table
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { ComparisonItem, MetricsPeriod } from '../../services/reports.service';
import { MetricKey } from './MetricPills';

interface ComparisonTableProps {
  data: ComparisonItem[];
  selectedMetrics: MetricKey[];
  breakdown?: string;
  secondaryBreakdown?: string;
  currency?: string;
  isRTL?: boolean;
}

type SortKey = MetricKey | 'name' | 'primary' | 'secondary';
type SortDirection = 'asc' | 'desc';

export default function ComparisonTable({
  data,
  selectedMetrics,
  breakdown = 'none',
  secondaryBreakdown = 'none',
  currency = 'USD',
  isRTL = false,
}: ComparisonTableProps) {
  const t = useTranslations();

  // Check if we have multi-dimensional breakdown
  const hasSecondaryBreakdown = secondaryBreakdown !== 'none';

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
      default:
        return t('common.name');
    }
  };

  const getNameColumnLabel = (): string => {
    return getBreakdownLabel(breakdown);
  };

  // Parse name into primary and secondary parts
  const parseItemName = (name: string): { primary: string; secondary: string } => {
    if (hasSecondaryBreakdown && name.includes(' - ')) {
      const parts = name.split(' - ');
      return {
        primary: parts[0] || name,
        secondary: parts.slice(1).join(' - ') || ''
      };
    }
    return { primary: name, secondary: '' };
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
        const aParsed = parseItemName(a.name);
        const bParsed = parseItemName(b.name);
        aValue = aParsed.primary;
        bValue = bParsed.primary;
      } else if (sortKey === 'secondary') {
        const aParsed = parseItemName(a.name);
        const bParsed = parseItemName(b.name);
        aValue = aParsed.secondary;
        bValue = bParsed.secondary;
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
  }, [data, sortKey, sortDirection, hasSecondaryBreakdown]);

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
      case 'cpm':
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

    // For cost metrics (CPC, CPA, CPM), negative is good
    const costMetrics: MetricKey[] = ['cpc', 'cpa', 'cpm'];
    const isPositiveGood = !costMetrics.includes(metric);

    if (isPositiveGood) {
      return changePct > 0 ? 'text-green-400' : 'text-red-400';
    } else {
      return changePct < 0 ? 'text-green-400' : 'text-red-400';
    }
  };

  const getMetricLabel = (metric: MetricKey): string => {
    const labels: Record<MetricKey, string> = {
      spend: t('metrics.spend'),
      impressions: t('metrics.impressions'),
      clicks: t('metrics.clicks'),
      ctr: t('metrics.ctr'),
      cpc: t('metrics.cpc'),
      cpm: t('metrics.cpm'),
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
              className={`
                px-4 py-3 text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-700/50 transition-colors
                sticky left-0 bg-gray-800/50 z-10
                ${isRTL ? 'text-right' : 'text-left'}
              `}
            >
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
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
                className={`
                  px-4 py-3 text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-700/50 transition-colors
                  ${isRTL ? 'text-right' : 'text-left'}
                `}
              >
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span>{getBreakdownLabel(secondaryBreakdown)}</span>
                  {sortKey === 'secondary' && (
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
            const parsedName = parseItemName(item.name);
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
                  className={`
                    px-4 py-3 text-sm text-gray-200 font-medium
                    sticky left-0 bg-inherit z-10
                    ${isRTL ? 'text-right' : 'text-left'}
                  `}
                >
                  {parsedName.primary}
                </td>

                {/* Secondary breakdown value (if applicable) */}
                {hasSecondaryBreakdown && (
                  <td
                    className={`
                      px-4 py-3 text-sm text-gray-300
                      ${isRTL ? 'text-right' : 'text-left'}
                    `}
                  >
                    {parsedName.secondary}
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
          <p>No data available for the selected filters</p>
        </div>
      )}
    </div>
  );
}
