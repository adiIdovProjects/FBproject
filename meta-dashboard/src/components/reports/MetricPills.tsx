/**
 * MetricPills Component
 * Interactive pill/tag selector for metrics (Tableau-inspired)
 */

import React from 'react';
import { useTranslations } from 'next-intl';

export type MetricKey =
  | 'spend'
  | 'impressions'
  | 'clicks'
  | 'ctr'
  | 'cpc'
  | 'cpm'
  | 'conversions'
  | 'conversion_value'
  | 'roas'
  | 'cpa';

export const ALL_METRICS: MetricKey[] = [
  'spend',
  'ctr',
  'cpc',
  'cpm',
  'impressions',
  'clicks',
  'conversions',
  'conversion_value',
  'roas',
  'cpa',
];

interface MetricPillsProps {
  selectedMetrics: MetricKey[];
  onMetricsChange: (metrics: MetricKey[]) => void;
  isRTL?: boolean;
  hasConversionValue?: boolean; // Hide ROAS if no conversion value
}

export default function MetricPills({
  selectedMetrics,
  onMetricsChange,
  isRTL = false,
  hasConversionValue = true,
}: MetricPillsProps) {
  const t = useTranslations();

  // Filter out ROAS if there's no conversion value
  const availableMetrics = hasConversionValue
    ? ALL_METRICS
    : ALL_METRICS.filter(m => m !== 'roas');

  const toggleMetric = (metric: MetricKey) => {
    if (selectedMetrics.includes(metric)) {
      // Deselect
      onMetricsChange(selectedMetrics.filter((m) => m !== metric));
    } else {
      // Select
      onMetricsChange([...selectedMetrics, metric]);
    }
  };

  const selectAll = () => {
    onMetricsChange(availableMetrics);
  };

  const clearAll = () => {
    onMetricsChange([]);
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

  return (
    <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Header with Select/Clear buttons */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <h3 className="text-sm font-semibold text-gray-300">{t('select_metrics')}</h3>
        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <button
            onClick={selectAll}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {t('select_all')}
          </button>
          <span className="text-gray-600">|</span>
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            {t('clear_all')}
          </button>
        </div>
      </div>

      {/* Metric pills grid */}
      <div className="flex flex-wrap gap-2">
        {availableMetrics.map((metric) => {
          const isSelected = selectedMetrics.includes(metric);
          return (
            <button
              key={metric}
              onClick={() => toggleMetric(metric)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${
                  isSelected
                    ? 'bg-blue-600 text-white border-2 border-blue-500 shadow-md'
                    : 'bg-gray-800 text-gray-400 border-2 border-gray-700 hover:border-gray-600 hover:text-gray-300'
                }
              `}
            >
              {isSelected && '✓ '}
              {getMetricLabel(metric)}
            </button>
          );
        })}
      </div>

      {/* Warning if no metrics selected */}
      {selectedMetrics.length === 0 && (
        <p className="text-xs text-yellow-500 mt-2">
          ⚠️ {t('no_metrics_selected')}
        </p>
      )}

      {/* Counter */}
      <p className="text-xs text-gray-500">
        {selectedMetrics.length} / {availableMetrics.length} {t('select_metrics').toLowerCase()}
      </p>
    </div>
  );
}
