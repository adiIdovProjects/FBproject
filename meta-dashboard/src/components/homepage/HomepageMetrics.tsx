"use client";

import React from 'react';
import { Card } from '@tremor/react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Target, TrendingUp, BarChart3, Loader2 } from 'lucide-react';
import { fetchOverviewSummary } from '@/services/insights.service';
import { useAccount } from '@/context/AccountContext';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, color }) => {
  return (
    <Card className="card-gradient border-border-subtle">
      <div className="flex items-center gap-3 p-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-lg font-bold text-white">{value}</p>
        </div>
      </div>
    </Card>
  );
};

interface HomepageMetricsProps {
  locale?: string;
}

const HomepageMetrics: React.FC<HomepageMetricsProps> = ({ locale = 'en' }) => {
  const t = useTranslations();
  const { selectedAccountId } = useAccount();

  const { data, isLoading } = useQuery({
    queryKey: ['overview-summary', selectedAccountId, locale],
    queryFn: () => fetchOverviewSummary(selectedAccountId, locale),
    enabled: !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  });

  // Use weekly metrics for the metric cards
  const metrics = data?.weekly?.metrics;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(locale).format(value);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="card-gradient border-border-subtle">
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        icon={<DollarSign className="w-5 h-5 text-white" />}
        label={t('homepage2.metrics.spend')}
        value={metrics?.spend ? formatCurrency(metrics.spend) : '-'}
        color="bg-blue-500/20"
      />
      <MetricCard
        icon={<Target className="w-5 h-5 text-white" />}
        label={t('homepage2.metrics.conversions')}
        value={metrics?.conversions ? formatNumber(metrics.conversions) : '-'}
        color="bg-green-500/20"
      />
      <MetricCard
        icon={<TrendingUp className="w-5 h-5 text-white" />}
        label={t('homepage2.metrics.cpa')}
        value={metrics?.cpa ? formatCurrency(metrics.cpa) : '-'}
        color="bg-purple-500/20"
      />
      <MetricCard
        icon={<BarChart3 className="w-5 h-5 text-white" />}
        label={t('homepage2.metrics.roas')}
        value={metrics?.roas ? `${metrics.roas.toFixed(2)}x` : '-'}
        color="bg-amber-500/20"
      />
    </div>
  );
};

export default HomepageMetrics;
