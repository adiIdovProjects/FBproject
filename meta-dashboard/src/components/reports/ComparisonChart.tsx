/**
 * ComparisonChart Component
 * Displays period-to-period comparison data as a bar chart
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Dot } from 'recharts';
import { ComparisonItem } from '../../services/reports.service';
import { MetricKey } from './MetricPills';

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

  if (selectedMetrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>{t('no_metrics_selected')}</p>
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
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-gray-200 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const metricKey = entry.dataKey.replace('_period1', '').replace('_period2', '') as MetricKey;
            const period = entry.dataKey.includes('period1') ? t('period_1') : t('period_2');
            return (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="text-gray-400">{period}:</span>
                <span className="text-gray-200 font-medium">
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
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="name"
            stroke="#9CA3AF"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <YAxis
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />

          {/* Render lines for each selected metric */}
          {selectedMetrics.map((metric, idx) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={`${metric}_period1`}
              name={getMetricLabel(metric)}
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
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
