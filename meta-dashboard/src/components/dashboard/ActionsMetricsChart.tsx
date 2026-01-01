/**
 * ActionsMetricsChart Component
 * Dual Y-axis line chart with two metric selectors using Recharts
 */

import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';
import { DailyMetric, MetricType, MetricOption } from '../../types/dashboard.types';

interface ActionsMetricsChartProps {
  dailyData: DailyMetric[];
  selectedMetric: MetricType;
  onMetricChange: (metric: MetricType) => void;
  isLoading?: boolean;
  currency?: string;
}

const METRIC_OPTIONS: MetricOption[] = [
  { value: 'actions', label: 'Conversions', format: 'number' },
  { value: 'spend', label: 'Spend', format: 'currency' },
  { value: 'clicks', label: 'Clicks', format: 'number' },
  { value: 'ctr', label: 'CTR', format: 'percentage' },
  { value: 'cpc', label: 'CPC', format: 'currency' },
  { value: 'cpm', label: 'CPM', format: 'currency' },
  { value: 'impressions', label: 'Impressions', format: 'number' },
];

export const ActionsMetricsChart: React.FC<ActionsMetricsChartProps> = ({
  dailyData,
  selectedMetric,
  onMetricChange,
  isLoading = false,
  currency = 'USD',
}) => {
  const t = useTranslations();
  // Second metric for dual Y-axis
  const [secondMetric, setSecondMetric] = useState<MetricType | null>(null);

  const currentMetricOption = METRIC_OPTIONS.find((opt) => opt.value === selectedMetric);
  const secondMetricOption = secondMetric ? METRIC_OPTIONS.find((opt) => opt.value === secondMetric) : null;

  // Helper function to calculate metric value
  const calculateMetricValue = (day: DailyMetric, metric: MetricType): number => {
    switch (metric) {
      case 'actions':
        return day.total_conversions || 0;
      case 'spend':
        return day.total_spend || 0;
      case 'clicks':
        return day.total_clicks || 0;
      case 'ctr':
        return day.total_impressions > 0 ? (day.total_clicks / day.total_impressions) * 100 : 0;
      case 'cpc':
        return day.total_clicks > 0 ? day.total_spend / day.total_clicks : 0;
      case 'cpm':
        return day.total_impressions > 0 ? (day.total_spend / day.total_impressions) * 1000 : 0;
      case 'impressions':
        return day.total_impressions || 0;
      default:
        return 0;
    }
  };

  // Transform data for chart (supports dual Y-axis)
  const chartData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return [];

    return dailyData.map((day) => {
      const dataPoint: any = {
        date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        primaryValue: calculateMetricValue(day, selectedMetric),
      };

      // Add second metric if selected
      if (secondMetric) {
        dataPoint.secondaryValue = calculateMetricValue(day, secondMetric);
      }

      return dataPoint;
    });
  }, [dailyData, selectedMetric, secondMetric]);

  // Format value based on metric type
  const formatValue = (val: number, metricOption?: MetricOption): string => {
    if (!metricOption || !isFinite(val)) return '0';

    switch (metricOption.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(2)}%`;
      default:
        return val.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex items-center justify-center h-96 text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="card-gradient p-8 rounded-3xl border border-border-subtle shadow-xl">
      {/* Header with Metric Selectors */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-6">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">{t('extracted_performance_trend')}</h3>
          <p className="text-gray-500 text-sm">{t('dashboard_subtitle')}</p>
        </div>

        <div className="flex gap-4 flex-wrap">
          {/* Primary Metric Selector */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t('extracted_primary_metric')}</label>
            <select
              value={selectedMetric}
              onChange={(e) => onMetricChange(e.target.value as MetricType)}
              className="bg-gray-900/50 text-white text-sm px-4 py-2.5 rounded-xl border border-accent hover:border-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all cursor-pointer"
            >
              {METRIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-900">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Secondary Metric Selector */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t('extracted_compare_with_optional')}</label>
            <select
              value={secondMetric || ''}
              onChange={(e) => setSecondMetric(e.target.value ? e.target.value as MetricType : null)}
              className="bg-gray-900/50 text-white text-sm px-4 py-2.5 rounded-xl border border-green-500/50 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all cursor-pointer"
            >
              <option value="" className="bg-gray-900">{t('extracted_none')}</option>
              {METRIC_OPTIONS.filter(opt => opt.value !== selectedMetric).map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-900">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[450px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#475569"
              tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />

            <YAxis
              yAxisId="left"
              stroke="#6366f1"
              tick={{ fill: '#6366f1', fontSize: 11, fontWeight: 600 }}
              tickFormatter={(val) => formatValue(val, currentMetricOption)}
              axisLine={false}
              tickLine={false}
              dx={-10}
            />

            {secondMetric && secondMetricOption && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#10b981"
                tick={{ fill: '#10b981', fontSize: 11, fontWeight: 600 }}
                tickFormatter={(val) => formatValue(val, secondMetricOption)}
                axisLine={false}
                tickLine={false}
                dx={10}
              />
            )}

            <Tooltip
              contentStyle={{
                backgroundColor: '#0F172A',
                border: '1px solid #1E293B',
                borderRadius: '16px',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
                padding: '12px'
              }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
              formatter={(value: number, name: string) => {
                if (name === 'primaryValue') {
                  return [formatValue(value, currentMetricOption), currentMetricOption?.label];
                }
                if (name === 'secondaryValue' && secondMetricOption) {
                  return [formatValue(value, secondMetricOption), secondMetricOption.label];
                }
                return [value, name];
              }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '30px', paddingRight: '10px' }}
              formatter={(value) => {
                const label = value === 'primaryValue' ? currentMetricOption?.label : secondMetricOption?.label;
                return <span className="text-xs font-bold text-gray-400 capitalize">{label}</span>;
              }}
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="primaryValue"
              stroke="#6366f1"
              strokeWidth={4}
              dot={false}
              activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
              animationDuration={1500}
            />

            {secondMetric && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="secondaryValue"
                stroke="#10b981"
                strokeWidth={4}
                dot={false}
                activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                animationDuration={1500}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ActionsMetricsChart;
