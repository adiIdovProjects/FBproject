"use client";

/**
 * Weekly Performance Chart
 * Simple line chart showing performance trend for the last 7 days
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { fetchMetricsWithTrends } from '@/services/dashboard.service';
import { useAccount } from '@/context/AccountContext';
import { useTheme } from '@/context/ThemeContext';

type ChartMetric = 'spend' | 'impressions' | 'clicks' | 'conversions' | 'cpa';

interface WeeklyPerformanceChartProps {
  startDate: string;
  endDate: string;
}

export default function WeeklyPerformanceChart({ startDate, endDate }: WeeklyPerformanceChartProps) {
  const t = useTranslations();
  const { selectedAccountId } = useAccount();
  const { theme } = useTheme();
  const isColorful = theme === 'colorful';
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('spend');

  const lineColor = isColorful ? '#8B5CF6' : '#6366f1';

  const { data, isLoading } = useQuery({
    queryKey: ['weekly-performance', startDate, endDate, selectedAccountId],
    queryFn: () => fetchMetricsWithTrends({ startDate, endDate }, selectedAccountId),
    enabled: !!startDate && !!endDate && !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useMemo(() => {
    if (!data?.dailyData) return [];

    return data.dailyData.map((point) => {
      const spend = point.total_spend || 0;
      const conversions = point.total_conversions || 0;
      const cpa = conversions > 0 ? spend / conversions : 0;

      return {
        date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        spend,
        impressions: point.total_impressions || 0,
        clicks: point.total_clicks || 0,
        conversions,
        cpa,
      };
    });
  }, [data]);

  // Metric configuration for labels and formatting
  const metricConfig: Record<ChartMetric, { label: string; isCurrency: boolean }> = {
    spend: { label: t('metrics.spend') || 'Spend', isCurrency: true },
    impressions: { label: t('metrics.impressions') || 'Impressions', isCurrency: false },
    clicks: { label: t('metrics.clicks') || 'Clicks', isCurrency: false },
    conversions: { label: t('metrics.conversions') || 'Conversions', isCurrency: false },
    cpa: { label: t('metrics.cpa') || 'Cost per Conversion', isCurrency: true },
  };

  // Shared header component
  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-accent" />
        <h3 className="font-bold text-foreground">{t('dashboard.weekly_performance') || 'Weekly Performance'}</h3>
      </div>
      <select
        value={selectedMetric}
        onChange={(e) => setSelectedMetric(e.target.value as ChartMetric)}
        className="bg-secondary/50 border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-foreground focus:border-accent/50 outline-none cursor-pointer"
      >
        <option value="spend">{metricConfig.spend.label}</option>
        <option value="impressions">{metricConfig.impressions.label}</option>
        <option value="clicks">{metricConfig.clicks.label}</option>
        <option value="conversions">{metricConfig.conversions.label}</option>
        <option value="cpa">{metricConfig.cpa.label}</option>
      </select>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-card-bg/60 border border-border-subtle rounded-2xl p-5 h-full">
        {renderHeader()}
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-card-bg/60 border border-border-subtle rounded-2xl p-5 h-full">
        {renderHeader()}
        <div className="flex items-center justify-center h-64 text-text-muted">
          {t('common.no_data_available') || 'No data available'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card-bg/60 border border-border-subtle rounded-2xl p-5 h-full">
      {renderHeader()}

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="var(--chart-axis)"
              tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="var(--chart-axis)"
              tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => {
                if (metricConfig[selectedMetric].isCurrency) {
                  if (val >= 1000) return '$' + (val / 1000).toFixed(0) + 'K';
                  return '$' + val.toFixed(0);
                }
                if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
                return val.toFixed(0);
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--foreground)',
                borderRadius: '12px',
                padding: '8px 12px',
              }}
              formatter={(value: number) => {
                const config = metricConfig[selectedMetric];
                const formattedValue = config.isCurrency
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: data?.currency || 'USD',
                      minimumFractionDigits: selectedMetric === 'cpa' ? 2 : 0,
                    }).format(value)
                  : new Intl.NumberFormat('en-US').format(value);
                return [formattedValue, config.label];
              }}
            />
            <Line
              type="monotone"
              dataKey={selectedMetric}
              stroke={lineColor}
              strokeWidth={3}
              dot={{ r: 4, fill: lineColor, stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: lineColor, stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
