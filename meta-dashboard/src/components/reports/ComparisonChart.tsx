/**
 * ComparisonChart Component
 * Displays period-to-period comparison data as a bar chart
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ComparisonItem } from '../../services/reports.service';
import { MetricKey } from './MetricPills';

// Vibrant color palette for bars
const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
];

interface ComparisonChartProps {
  data: ComparisonItem[];
  selectedMetrics: MetricKey[];
  currency?: string;
  isRTL?: boolean;
}

export default function ComparisonChart({
  data,
  selectedMetrics,
  currency = 'USD',
  isRTL = false,
}: ComparisonChartProps) {
  const t = useTranslations();

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

  const formatValue = (metric: MetricKey, value: number | null): string => {
    if (value === null || value === undefined) return '-';

    switch (metric) {
      case 'spend':
      case 'cpc':
      case 'cpm':
      case 'cpa':
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

  if (selectedMetrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>{t('reports.no_metrics_selected')}</p>
      </div>
    );
  }

  // Prepare chart data - one entry per item (campaign/ad) with all selected metrics
  const chartData = data.map((item) => {
    const entry: any = {
      name: item.name,
    };

    selectedMetrics.forEach((metric) => {
      entry[`${metric}_period1`] = item.period1[metric] || 0;
      entry[`${metric}_period2`] = item.period2[metric] || 0;
    });

    return entry;
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl">
        <p className="text-sm font-bold text-white mb-3 border-b border-gray-700 pb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => {
            const metricKey = entry.dataKey.replace('_period1', '').replace('_period2', '') as MetricKey;
            return (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-300">{getMetricLabel(metricKey)}</span>
                </div>
                <span className="text-white font-semibold">
                  {formatValue(metricKey, entry.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#9CA3AF"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            interval={0}
          />
          <YAxis
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="rect"
          />

          {/* Render bars for each selected metric with distinct colors */}
          {selectedMetrics.map((metric, idx) => (
            <Bar
              key={metric}
              dataKey={`${metric}_period1`}
              name={getMetricLabel(metric)}
              fill={CHART_COLORS[idx % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Empty state */}
      {data.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No data available for the selected filters</p>
        </div>
      )}
    </div>
  );
}
