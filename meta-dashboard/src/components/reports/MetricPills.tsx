/**
 * MetricPills Component
 * Interactive pill/tag selector for metrics (Tableau-inspired)
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { InfoTooltip } from '../ui/InfoTooltip';

export type MetricKey =
  | 'spend'
  | 'impressions'
  | 'clicks'
  | 'ctr'
  | 'cpc'
  | 'conversions'
  | 'conversion_value'
  | 'roas'
  | 'cpa'
  | 'conversion_rate';

export const ALL_METRICS: MetricKey[] = [
  'spend',
  'ctr',
  'cpc',
  'impressions',
  'clicks',
  'conversions',
  'conversion_value',
  'roas',
  'cpa',
  'conversion_rate',
];

// Metrics that require conversion data (not available for special breakdowns)
const CONVERSION_METRICS: MetricKey[] = ['conversions', 'conversion_value', 'roas', 'cpa', 'conversion_rate'];

interface MetricPillsProps {
  selectedMetrics: MetricKey[];
  onMetricsChange: (metrics: MetricKey[]) => void;
  isRTL?: boolean;
  hasConversionValue?: boolean; // Hide ROAS if no conversion value
  isSpecialBreakdown?: boolean; // Hide all conversion metrics for placement/demographics/country
}

export default function MetricPills({
  selectedMetrics,
  onMetricsChange,
  isRTL = false,
  hasConversionValue = true,
  isSpecialBreakdown = false,
}: MetricPillsProps) {
  const t = useTranslations();

  // Filter metrics based on breakdown type
  let availableMetrics = ALL_METRICS;

  // Special breakdowns (placement, demographics, country) don't have conversion data from Facebook
  if (isSpecialBreakdown) {
    availableMetrics = ALL_METRICS.filter(m => !CONVERSION_METRICS.includes(m));
  }
  // If no conversion value, just hide ROAS
  else if (!hasConversionValue) {
    availableMetrics = ALL_METRICS.filter(m => m !== 'roas');
  }

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
    return t(`metrics.${metric}`);
  };

  const getTooltipKey = (metric: MetricKey): string => {
    // Map metric to its tooltip key
    const tooltipKeys: Record<MetricKey, string> = {
      spend: 'metrics.spend_tooltip',
      impressions: 'metrics.impressions_tooltip',
      clicks: 'metrics.clicks_tooltip',
      ctr: 'metrics.ctr_tooltip',
      cpc: 'metrics.cpc_tooltip',
      conversions: 'metrics.conversions_tooltip',
      conversion_value: 'metrics.conversion_value_tooltip',
      roas: 'metrics.roas_tooltip',
      cpa: 'metrics.cpa_tooltip',
      conversion_rate: 'metrics.conversion_rate_tooltip',
    };
    return tooltipKeys[metric];
  };

  return (
    <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Header with Select/Clear buttons */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">{t('reports.metric_select')}</h3>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {t('actions.select_all')}
          </button>
          <span className="text-gray-600">|</span>
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            {t('actions.clear_all')}
          </button>
        </div>
      </div>

      {/* Metric pills grid */}
      <div className="flex flex-wrap gap-2">
        {availableMetrics.map((metric) => {
          const isSelected = selectedMetrics.includes(metric);
          return (
            <div key={metric} className="flex items-center gap-1">
              <button
                onClick={() => toggleMetric(metric)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all
                  ${isSelected
                    ? 'bg-blue-600 text-white border-2 border-blue-500 shadow-md'
                    : 'bg-gray-800 text-gray-400 border-2 border-gray-700 hover:border-gray-600 hover:text-gray-300'
                  }
                `}
              >
                {isSelected && '✓ '}
                {getMetricLabel(metric)}
              </button>
              <InfoTooltip tooltipKey={getTooltipKey(metric)} size="sm" />
            </div>
          );
        })}
      </div>

      {/* Warning if no metrics selected */}
      {selectedMetrics.length === 0 && (
        <p className="text-xs text-yellow-500 mt-2">
          ⚠️ {t('reports.no_metrics_selected')}
        </p>
      )}

      {/* Counter */}
      <p className="text-xs text-gray-500">
        {selectedMetrics.length} / {availableMetrics.length} {t('reports.metric_select').toLowerCase()}
      </p>
    </div>
  );
}
