"use client";

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { fetchTrendData } from '@/services/campaigns.service';
import { useAccount } from '@/context/AccountContext';
import { formatDate, calculateDateRange } from '@/utils/date';
import { ActionsMetricsChart } from '@/components/dashboard/ActionsMetricsChart';
import { MetricType } from '@/types/dashboard.types';
import { QuickSelectKey } from '@/constants/app';

interface PerformanceChartProps {
  dateRange?: QuickSelectKey;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ dateRange = 'last_30_days' }) => {
  const t = useTranslations();
  const { selectedAccountId } = useAccount();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('spend');

  // Calculate date range
  const range = calculateDateRange(dateRange);
  const startDate = formatDate(range.start) || '';
  const endDate = formatDate(range.end) || '';

  // Fetch trend data
  const { data: trendData, isLoading } = useQuery({
    queryKey: ['performance-trend', startDate, endDate, selectedAccountId],
    queryFn: () => fetchTrendData({ startDate, endDate }, 'day', selectedAccountId),
    enabled: !!startDate && !!endDate && !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  });

  // Transform trend data to match ActionsMetricsChart format
  const chartData = useMemo(() => {
    if (!trendData) return [];
    return trendData.map((item: any) => ({
      date: item.date,
      total_spend: item.spend || 0,
      total_clicks: item.clicks || 0,
      total_impressions: item.impressions || 0,
      total_conversions: item.conversions || 0,
    }));
  }, [trendData]);

  return (
    <ActionsMetricsChart
      dailyData={chartData}
      selectedMetric={selectedMetric}
      onMetricChange={setSelectedMetric}
      isLoading={isLoading}
      granularity="day"
    />
  );
};

export default PerformanceChart;
