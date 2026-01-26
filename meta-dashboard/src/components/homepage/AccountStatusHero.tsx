"use client";

/**
 * AccountStatusHero Component
 * Shows account health status with human-readable headline and mini stats
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, Metric, Text } from '@tremor/react';
import { CheckCircle, AlertTriangle, AlertCircle, Loader2, DollarSign, Target, Zap } from 'lucide-react';
import { fetchMetricsWithTrends } from '../../services/dashboard.service';
import { fetchCampaignsWithComparison } from '../../services/campaigns.service';
import { formatDate, calculateDateRange } from '../../utils/date';
import { CampaignRow } from '../../types/campaigns.types';

interface AccountStatusHeroProps {
  accountId: string | null;
}

type AccountHealth = 'good' | 'attention' | 'issues' | 'new_user' | 'loading';

// Health calculation for a single campaign (reused from SimpleCampaignList logic)
function getCampaignHealthStatus(campaign: CampaignRow): 'great' | 'attention' | 'problem' {
  if (campaign.spend === 0) return 'great';
  if (campaign.spend > 50 && campaign.conversions === 0 && campaign.clicks < 10) return 'problem';
  if (campaign.conversions > 0) return 'great';
  if (campaign.ctr > 1) return 'great';
  if (campaign.ctr < 1 && campaign.impressions > 1000) return 'attention';
  return 'attention';
}

// Calculate overall account health
function calculateAccountHealth(campaigns: CampaignRow[]): AccountHealth {
  const activeCampaigns = campaigns.filter(c => c.campaign_status === 'ACTIVE');

  if (campaigns.length === 0) return 'new_user';
  if (activeCampaigns.length === 0) return 'good'; // All paused is fine

  const healthResults = activeCampaigns.map(getCampaignHealthStatus);
  const problems = healthResults.filter(h => h === 'problem').length;
  const attention = healthResults.filter(h => h === 'attention').length;

  if (problems > 0) return 'issues';
  if (attention >= 2) return 'attention';
  return 'good';
}

const healthConfig = {
  good: {
    icon: CheckCircle,
    iconColor: 'text-green-400',
    bgGradient: 'from-green-900/40 to-green-800/20',
    borderColor: 'border-green-500/30',
  },
  attention: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-400',
    bgGradient: 'from-yellow-900/40 to-yellow-800/20',
    borderColor: 'border-yellow-500/30',
  },
  issues: {
    icon: AlertCircle,
    iconColor: 'text-red-400',
    bgGradient: 'from-red-900/40 to-red-800/20',
    borderColor: 'border-red-500/30',
  },
  new_user: {
    icon: Zap,
    iconColor: 'text-accent',
    bgGradient: 'from-indigo-900/40 to-purple-800/20',
    borderColor: 'border-accent/30',
  },
  loading: {
    icon: Loader2,
    iconColor: 'text-gray-400',
    bgGradient: 'from-gray-900/40 to-gray-800/20',
    borderColor: 'border-gray-500/30',
  },
};

const AccountStatusHero: React.FC<AccountStatusHeroProps> = ({ accountId }) => {
  const t = useTranslations();

  // Get last 7 days
  const dateRange = calculateDateRange('last_7_days');
  const startDate = formatDate(dateRange.start) || '';
  const endDate = formatDate(dateRange.end) || '';

  // Fetch metrics
  const { data: metricsData, isLoading: isMetricsLoading } = useQuery({
    queryKey: ['hero-metrics', startDate, endDate, accountId],
    queryFn: () => fetchMetricsWithTrends({ startDate, endDate }, accountId, 'day'),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch campaigns for health calculation
  const { data: campaigns, isLoading: isCampaignsLoading } = useQuery({
    queryKey: ['hero-campaigns', startDate, endDate, accountId],
    queryFn: () => fetchCampaignsWithComparison(
      { startDate, endDate },
      [],
      '',
      'spend',
      'desc',
      accountId
    ),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = isMetricsLoading || isCampaignsLoading;
  const health = isLoading ? 'loading' : calculateAccountHealth(campaigns || []);
  const config = healthConfig[health];
  const Icon = config.icon;

  // Stats
  const currency = metricsData?.currency || 'USD';
  const spend = metricsData?.current?.spend || 0;
  const results = metricsData?.current?.actions || 0;
  const activeCampaigns = campaigns?.filter(c => c.campaign_status === 'ACTIVE').length || 0;

  // Count issues for subtitle
  const attentionCount = campaigns?.filter(c => {
    const h = getCampaignHealthStatus(c);
    return h === 'attention' || h === 'problem';
  }).length || 0;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className={`bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} p-6`}>
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        {/* Status Icon and Text */}
        <div className="flex items-center gap-4 flex-1">
          <div className={`p-4 rounded-2xl bg-white/10 ${isLoading ? 'animate-pulse' : ''}`}>
            <Icon className={`w-10 h-10 ${config.iconColor} ${health === 'loading' ? 'animate-spin' : ''}`} />
          </div>

          <div>
            {isLoading ? (
              <>
                <div className="h-8 w-64 bg-white/10 rounded animate-pulse mb-2" />
                <div className="h-5 w-48 bg-white/10 rounded animate-pulse" />
              </>
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl font-black text-white">
                  {t(`homepage.hero.${health}_title`)}
                </h1>
                <p className="text-gray-300 mt-1">
                  {health === 'attention' || health === 'issues'
                    ? t(`homepage.hero.${health}_subtitle`, { count: attentionCount })
                    : t(`homepage.hero.${health}_subtitle`)
                  }
                </p>
              </>
            )}
          </div>
        </div>

        {/* Mini Stats */}
        {health !== 'new_user' && (
          <div className="flex items-center gap-6 md:gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs uppercase tracking-wider mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{t('homepage.quick_stats.spent')}</span>
              </div>
              {isLoading ? (
                <div className="h-7 w-20 bg-white/10 rounded animate-pulse mx-auto" />
              ) : (
                <Metric className="text-white text-xl font-bold">{formatCurrency(spend)}</Metric>
              )}
            </div>

            <div className="w-px h-10 bg-white/20" />

            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs uppercase tracking-wider mb-1">
                <Target className="w-3.5 h-3.5" />
                <span>{t('homepage.quick_stats.results')}</span>
              </div>
              {isLoading ? (
                <div className="h-7 w-16 bg-white/10 rounded animate-pulse mx-auto" />
              ) : (
                <Metric className="text-white text-xl font-bold">{results.toLocaleString()}</Metric>
              )}
            </div>

            <div className="w-px h-10 bg-white/20" />

            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs uppercase tracking-wider mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span>{t('homepage.quick_stats.active')}</span>
              </div>
              {isLoading ? (
                <div className="h-7 w-12 bg-white/10 rounded animate-pulse mx-auto" />
              ) : (
                <Metric className="text-white text-xl font-bold">{activeCampaigns}</Metric>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AccountStatusHero;
