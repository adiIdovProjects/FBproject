"use client";

/**
 * Dashboard KPI Cards
 * Shows 4 KPI cards with percentage change badges: Spend, Impressions, Clicks, Conversions
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Eye, MousePointer, Target, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchMetricsWithTrends } from '@/services/dashboard.service';
import { useAccount } from '@/context/AccountContext';

interface DashboardKPICardsProps {
  startDate: string;
  endDate: string;
}

export default function DashboardKPICards({ startDate, endDate }: DashboardKPICardsProps) {
  const t = useTranslations();
  const { selectedAccountId } = useAccount();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-kpi', startDate, endDate, selectedAccountId],
    queryFn: () => fetchMetricsWithTrends({ startDate, endDate }, selectedAccountId),
    enabled: !!startDate && !!endDate && !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data?.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  };

  const kpis = useMemo(() => {
    if (!data) return [];

    return [
      {
        icon: DollarSign,
        label: t('dashboard.total_spend') || 'Total Spend',
        value: formatCurrency(data.current.spend),
        change: data.trends.spend,
        bgColor: 'bg-emerald-500',
        iconBg: 'bg-emerald-500',
      },
      {
        icon: Eye,
        label: t('dashboard.impressions') || 'Impressions',
        value: formatNumber(data.current.impressions),
        change: data.trends.impressions,
        bgColor: 'bg-blue-500',
        iconBg: 'bg-blue-500',
      },
      {
        icon: MousePointer,
        label: t('dashboard.clicks') || 'Clicks',
        value: formatNumber(data.current.clicks),
        change: data.trends.clicks,
        bgColor: 'bg-orange-500',
        iconBg: 'bg-orange-500',
      },
      {
        icon: Target,
        label: t('dashboard.conversions') || 'Conversions',
        value: formatNumber(data.current.actions),
        change: data.trends.actions,
        bgColor: 'bg-rose-500',
        iconBg: 'bg-rose-500',
      },
    ];
  }, [data, t]);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card-bg/60 border border-border-subtle rounded-2xl p-5">
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        const isPositive = kpi.change >= 0;

        return (
          <div
            key={index}
            className="bg-card-bg/60 border border-border-subtle rounded-2xl p-5 hover:border-accent/30 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-12 h-12 ${kpi.iconBg} rounded-xl flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              {/* Change Badge */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                isPositive
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {isPositive ? '+' : ''}{kpi.change.toFixed(1)}%
              </div>
            </div>

            <p className="text-sm text-text-muted mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
          </div>
        );
      })}
    </div>
  );
}
