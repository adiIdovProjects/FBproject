"use client";

/**
 * SimpleCampaignList Component
 * Shows top 5 campaigns with simple status and health indicators
 */

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, Text } from '@tremor/react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { fetchCampaignsWithComparison } from '../../services/campaigns.service';
import { formatDate, calculateDateRange } from '../../utils/date';
import { CampaignRow } from '../../types/campaigns.types';

interface SimpleCampaignListProps {
  accountId: string | null;
}

// Health calculation with reason
interface HealthResult {
  status: 'great' | 'attention' | 'problem';
  reason: string; // Translation key suffix
}

function getCampaignHealth(campaign: CampaignRow): HealthResult {
  // No spend = neutral (just started or paused)
  if (campaign.spend === 0) {
    return { status: 'great', reason: 'looking_good' };
  }

  // Problem: Spent money, no results
  if (campaign.spend > 50 && campaign.conversions === 0 && campaign.clicks < 10) {
    return { status: 'problem', reason: 'no_results' };
  }

  // Great: Has conversions
  if (campaign.conversions > 0) {
    return { status: 'great', reason: 'getting_results' };
  }

  // Great: Good CTR
  if (campaign.ctr > 1) {
    return { status: 'great', reason: 'good_engagement' };
  }

  // Attention: Low CTR
  if (campaign.ctr < 1 && campaign.impressions > 1000) {
    return { status: 'attention', reason: 'low_ctr' };
  }

  // Attention: Spending but no conversions
  return { status: 'attention', reason: 'no_conversions' };
}

// Export for use in SimpleRecommendations
export { getCampaignHealth };
export type { HealthResult };

const healthConfig = {
  great: { emoji: '\u2705', color: 'text-green-400' },
  attention: { emoji: '\u26A0\uFE0F', color: 'text-yellow-400' },
  problem: { emoji: '\uD83D\uDD34', color: 'text-red-400' },
};

const statusConfig: Record<string, { color: string; bgColor: string }> = {
  ACTIVE: { color: 'text-green-400', bgColor: 'bg-green-900/30' },
  PAUSED: { color: 'text-yellow-400', bgColor: 'bg-yellow-900/30' },
  ARCHIVED: { color: 'text-gray-400', bgColor: 'bg-gray-700' },
};

const SimpleCampaignList: React.FC<SimpleCampaignListProps> = ({ accountId }) => {
  const t = useTranslations();
  const locale = useLocale();

  // Get last 30 days
  const dateRange = calculateDateRange('last_30_days');
  const startDate = formatDate(dateRange.start) || '';
  const endDate = formatDate(dateRange.end) || '';

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['homepage-campaign-list', startDate, endDate, accountId],
    queryFn: () => fetchCampaignsWithComparison(
      { startDate, endDate },
      [], // All statuses
      '',
      'spend',
      'desc',
      accountId
    ),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });

  // Take top 5 by spend
  const topCampaigns = campaigns?.slice(0, 5) || [];

  return (
    <Card className="card-gradient border-border-subtle">
      <div className="flex items-center justify-between mb-4">
        <Text className="text-white font-bold text-lg">{t('homepage.campaigns.title')}</Text>
        <Link
          href={`/${locale}/campaigns`}
          className="text-accent text-sm hover:underline flex items-center gap-1"
        >
          {t('homepage.campaigns.view_all')}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : topCampaigns.length === 0 ? (
        <div className="text-center py-12">
          <Text className="text-gray-500">{t('homepage.campaigns.no_campaigns')}</Text>
          <Link
            href={`/${locale}/uploader/wizard`}
            className="text-accent text-sm hover:underline mt-2 inline-block"
          >
            {t('homepage.actions.create_campaign')}
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider py-2 px-2">
                  {t('common.name')}
                </th>
                <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider py-2 px-2">
                  {t('common.status')}
                </th>
                <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider py-2 px-2">
                  {t('homepage.quick_stats.results')}
                </th>
                <th className="text-center text-xs text-gray-500 font-semibold uppercase tracking-wider py-2 px-2">
                  Health
                </th>
              </tr>
            </thead>
            <tbody>
              {topCampaigns.map((campaign) => {
                const status = campaign.campaign_status || 'UNKNOWN';
                const statusStyle = statusConfig[status] || statusConfig.ARCHIVED;
                const health = getCampaignHealth(campaign);
                const healthStyle = healthConfig[health.status];
                const results = campaign.conversions > 0
                  ? campaign.conversions.toLocaleString()
                  : campaign.clicks > 0
                    ? `${campaign.clicks.toLocaleString()} clicks`
                    : '--';

                return (
                  <tr
                    key={campaign.campaign_id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <Text className="text-white font-medium truncate max-w-[200px]">
                        {campaign.campaign_name}
                      </Text>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyle.bgColor} ${statusStyle.color}`}>
                        {t(`status.${status}`)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Text className="text-gray-300">{results}</Text>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`${healthStyle.color} cursor-help`}
                        title={t(`homepage.campaigns.reason_${health.reason}`)}
                      >
                        {healthStyle.emoji}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default SimpleCampaignList;
