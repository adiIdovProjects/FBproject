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
  currency?: string;
  isRTL?: boolean;
}

type SortKey = MetricKey | 'name';
type SortDirection = 'asc' | 'desc';

export default function ComparisonTable({
  data,
  selectedMetrics,
  breakdown = 'none',
  currency = 'USD',
  isRTL = false,
}: ComparisonTableProps) {
  const t = useTranslations();

  const getNameColumnLabel = (): string => {
    switch (breakdown) {
      case 'campaign_name':
        return t('campaign_name');
      case 'ad_set_name':
        return t('ad_set_name');
      case 'ad_name':
        return t('ad_name');
      case 'date':
      case 'week':
      case 'month':
        return t('date');
      default:
        return t('name');
    }
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

      if (sortKey === 'name') {
        aValue = a.name;
        bValue = b.name;
      } else {
        aValue = a.period1[sortKey];
        bValue = b.period1[sortKey];
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [data, sortKey, sortDirection]);

  const formatValue = (metric: MetricKey, value: number | null): string => {
    if (value === null || value === undefined) return '-';

    switch (metric) {
      case 'spend':
      case 'cpc':
      case 'cpm':
      case 'cpa':
      case 'conversion_value':
        return `$${value.toFixed(2)}`;
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
      spend: t('spend'),
      impressions: t('impressions'),
      clicks: t('clicks'),
      ctr: t('ctr'),
      cpc: t('cpc'),
      cpm: t('cpm'),
      conversions: t('conversions'),
      conversion_value: t('conversion_value'),
      roas: t('roas'),
      cpa: t('cpa'),
    };
    return labels[metric];
  };

  if (selectedMetrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>{t('no_metrics_selected')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-800/50">
            {/* Name column */}
            <th
              onClick={() => handleSort('name')}
              className={`
                px-4 py-3 text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-700/50 transition-colors
                sticky left-0 bg-gray-800/50 z-10
                ${isRTL ? 'text-right' : 'text-left'}
              `}
            >
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <span>{getNameColumnLabel()}</span>
                {sortKey === 'name' && (
                  sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                )}
              </div>
            </th>

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
          {sortedData.map((item, idx) => (
            <tr
              key={item.id}
              className={`
                border-t border-gray-700 hover:bg-gray-800/30 transition-colors
                ${idx % 2 === 0 ? 'bg-gray-900/20' : ''}
              `}
            >
              {/* Name */}
              <td
                className={`
                  px-4 py-3 text-sm text-gray-200 font-medium
                  sticky left-0 bg-inherit z-10
                  ${isRTL ? 'text-right' : 'text-left'}
                `}
              >
                {item.name}
              </td>

              {/* Metrics */}
              {selectedMetrics.map((metric) => {
                const period1Value = item.period1[metric];
                const period2Value = item.period2[metric];
                const changePct = item.change_pct[metric];

                return (
                  <React.Fragment key={`${item.id}-${metric}`}>
                    <td className="px-4 py-3 text-sm text-gray-300 text-center">
                      {formatValue(metric, period1Value)}
                    </td>
                  </React.Fragment>
                );
              })}
            </tr>
          ))}
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
