"use client";

/**
 * QuickStats Component
 * Shows 3 simple KPI cards: Spent, Results, Active Campaigns
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, Metric, Text } from '@tremor/react';
import { DollarSign, Target, Zap, Loader2 } from 'lucide-react';
import { fetchMetricsWithTrends } from '../../services/dashboard.service';
import { fetchCampaignsWithComparison } from '../../services/campaigns.service';
import { formatDate, calculateDateRange } from '../../utils/date';

interface QuickStatsProps {
  accountId: string | null;
  startDate?: string | null;
  endDate?: string | null;
  showConversions?: boolean; // If true, shows "Conversions" instead of "Results"
}

const QuickStats: React.FC<QuickStatsProps> = ({ accountId, startDate: propStartDate, endDate: propEndDate, showConversions = false }) => {
  const t = useTranslations();

  // Use props if provided, otherwise default to last 7 days
  const dateRange = calculateDateRange('last_7_days');
  const startDate = propStartDate || formatDate(dateRange.start) || '';
  const endDate = propEndDate || formatDate(dateRange.end) || '';

  // Fetch metrics for spend and conversions
  const { data: metricsData, isLoading: isMetricsLoading } = useQuery({
    queryKey: ['homepage-metrics', startDate, endDate, accountId],
    queryFn: () => fetchMetricsWithTrends({ startDate, endDate }, accountId, 'day'),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch campaigns to count active ones
  const { data: campaignsData, isLoading: isCampaignsLoading } = useQuery({
    queryKey: ['homepage-campaigns', startDate, endDate, accountId],
    queryFn: () => fetchCampaignsWithComparison(
      { startDate, endDate },
      ['ACTIVE'],
      '',
      'spend',
      'desc',
      accountId
    ),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = isMetricsLoading || isCampaignsLoading;
  const currency = metricsData?.currency || 'USD';
  const spend = metricsData?.current?.spend || 0;
  const conversions = metricsData?.current?.actions || 0;
  const activeCampaigns = campaignsData?.length || 0;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const stats = [
    {
      label: t('homepage.quick_stats.spent'),
      sublabel: propStartDate ? '' : t('homepage.quick_stats.this_week'),
      value: formatCurrency(spend),
      icon: DollarSign,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: showConversions ? t('metrics.conversions') : t('homepage.quick_stats.results'),
      sublabel: propStartDate ? '' : t('homepage.quick_stats.this_week'),
      value: conversions.toLocaleString(),
      icon: Target,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: t('homepage.quick_stats.active_campaigns'),
      sublabel: '',
      value: activeCampaigns.toString(),
      icon: Zap,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="card-gradient border-border-subtle hover:border-accent/30 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                {stat.label}
              </Text>
              {stat.sublabel && (
                <Text className="text-text-disabled text-[10px]">{stat.sublabel}</Text>
              )}
              {isLoading ? (
                <div className="mt-2 flex items-center">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                </div>
              ) : (
                <Metric className="text-foreground text-3xl font-black mt-1">
                  {stat.value}
                </Metric>
              )}
            </div>
            <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default QuickStats;
