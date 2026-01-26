"use client";

/**
 * WhatsHappening Component
 * Shows top 3 alerts, wins, and trends in human-readable format
 */

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, Text } from '@tremor/react';
import {
  AlertTriangle,
  AlertCircle,
  Star,
  TrendingUp,
  TrendingDown,
  Info,
  ChevronRight,
  Loader2,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { fetchOverviewSummary, fetchInsightsSummary } from '../../services/insights.service';
import { fetchCampaignsWithComparison } from '../../services/campaigns.service';
import { formatDate, calculateDateRange } from '../../utils/date';
import { CampaignRow } from '../../types/campaigns.types';

interface WhatsHappeningProps {
  accountId: string | null;
}

interface HappeningItem {
  type: 'alert' | 'problem' | 'win' | 'opportunity' | 'trend' | 'info';
  headline: string;
  detail?: string;
  actionLabel: string;
  actionLink: string;
  priority: number; // Lower = higher priority
}

// Config for each item type
const itemConfig = {
  alert: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    borderColor: 'border-yellow-500/20',
    label: 'Alert',
  },
  problem: {
    icon: AlertCircle,
    iconColor: 'text-red-400',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-500/20',
    label: 'Issue',
  },
  win: {
    icon: Star,
    iconColor: 'text-green-400',
    bgColor: 'bg-green-900/20',
    borderColor: 'border-green-500/20',
    label: 'Win',
  },
  opportunity: {
    icon: Sparkles,
    iconColor: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-500/20',
    label: 'Opportunity',
  },
  trend: {
    icon: TrendingUp,
    iconColor: 'text-purple-400',
    bgColor: 'bg-purple-900/20',
    borderColor: 'border-purple-500/20',
    label: 'Trend',
  },
  info: {
    icon: Info,
    iconColor: 'text-gray-400',
    bgColor: 'bg-gray-800/50',
    borderColor: 'border-gray-500/20',
    label: 'Info',
  },
};

// Health check for campaigns
function getCampaignHealthStatus(campaign: CampaignRow): 'great' | 'attention' | 'problem' {
  if (campaign.spend === 0) return 'great';
  if (campaign.spend > 50 && campaign.conversions === 0 && campaign.clicks < 10) return 'problem';
  if (campaign.conversions > 0) return 'great';
  if (campaign.ctr > 1) return 'great';
  if (campaign.ctr < 1 && campaign.impressions > 1000) return 'attention';
  return 'attention';
}

const WhatsHappening: React.FC<WhatsHappeningProps> = ({ accountId }) => {
  const t = useTranslations();
  const locale = useLocale();

  // Get date ranges
  const dateRange7 = calculateDateRange('last_7_days');
  const dateRange30 = calculateDateRange('last_30_days');
  const startDate7 = formatDate(dateRange7.start) || '';
  const endDate7 = formatDate(dateRange7.end) || '';
  const startDate30 = formatDate(dateRange30.start) || '';
  const endDate30 = formatDate(dateRange30.end) || '';

  // Fetch overview summary (has improvement checks and period insights)
  const { data: overviewSummary, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['whats-happening-overview', accountId, locale],
    queryFn: () => fetchOverviewSummary(accountId, locale),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch AI insights
  const { data: aiInsights, isLoading: isInsightsLoading } = useQuery({
    queryKey: ['whats-happening-insights', startDate7, endDate7, accountId, locale],
    queryFn: () => fetchInsightsSummary(
      { startDate: startDate7, endDate: endDate7 },
      'dashboard',
      undefined,
      accountId,
      locale
    ),
    enabled: !!startDate7 && !!endDate7,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch campaigns for health-based items
  const { data: campaigns, isLoading: isCampaignsLoading } = useQuery({
    queryKey: ['whats-happening-campaigns', startDate30, endDate30, accountId],
    queryFn: () => fetchCampaignsWithComparison(
      { startDate: startDate30, endDate: endDate30 },
      ['ACTIVE'],
      '',
      'spend',
      'desc',
      accountId
    ),
    enabled: !!startDate30 && !!endDate30,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = isOverviewLoading || isInsightsLoading || isCampaignsLoading;

  // Build happening items from various sources
  const buildItems = (): HappeningItem[] => {
    const items: HappeningItem[] = [];

    // 1. Campaign health issues (highest priority)
    if (campaigns) {
      for (const campaign of campaigns) {
        const health = getCampaignHealthStatus(campaign);
        if (health === 'problem') {
          items.push({
            type: 'problem',
            headline: t('homepage.whats_happening.campaign_problem', { name: campaign.campaign_name }),
            detail: t('homepage.whats_happening.campaign_problem_detail'),
            actionLabel: t('homepage.whats_happening.fix_this'),
            actionLink: `/${locale}/uploader/add-creative`,
            priority: 1,
          });
        } else if (health === 'attention') {
          items.push({
            type: 'alert',
            headline: t('homepage.whats_happening.campaign_attention', { name: campaign.campaign_name }),
            detail: campaign.ctr < 1
              ? t('homepage.whats_happening.low_ctr_detail')
              : t('homepage.whats_happening.no_conversions_detail'),
            actionLabel: t('homepage.whats_happening.see_details'),
            actionLink: `/${locale}/campaigns`,
            priority: 2,
          });
        }
      }
    }

    // 2. Improvement checks from overview
    if (overviewSummary?.improvement_checks) {
      for (const check of overviewSummary.improvement_checks) {
        if (check.status === 'warning' || check.status === 'critical') {
          items.push({
            type: check.status === 'critical' ? 'problem' : 'alert',
            headline: check.message,
            actionLabel: t('homepage.whats_happening.learn_more'),
            actionLink: `/${locale}/learning`,
            priority: check.status === 'critical' ? 1 : 3,
          });
        }
      }
    }

    // 3. AI insights
    if (aiInsights) {
      for (const insight of aiInsights) {
        let itemType: HappeningItem['type'] = 'info';
        let priority = 5;

        if (insight.type === 'warning' || insight.priority === 'high') {
          itemType = 'alert';
          priority = 2;
        } else if (insight.type === 'opportunity' || insight.type === 'success') {
          itemType = 'win';
          priority = 4;
        } else if (insight.type === 'trend') {
          itemType = 'trend';
          priority = 5;
        }

        // Determine action link based on content
        let actionLink = `/${locale}/insights`;
        const lowerText = insight.text.toLowerCase();
        if (lowerText.includes('creative') || lowerText.includes('fatigue')) {
          actionLink = `/${locale}/creatives`;
        } else if (lowerText.includes('campaign')) {
          actionLink = `/${locale}/campaigns`;
        }

        items.push({
          type: itemType,
          headline: insight.text,
          actionLabel: t('homepage.whats_happening.see_details'),
          actionLink,
          priority,
        });
      }
    }

    // 4. Period trends from overview (wins)
    if (overviewSummary?.daily?.status === 'ok' && overviewSummary.daily.color === 'green') {
      items.push({
        type: 'win',
        headline: overviewSummary.daily.insight,
        actionLabel: t('homepage.whats_happening.view_report'),
        actionLink: `/${locale}/account-dashboard`,
        priority: 4,
      });
    }

    // Sort by priority and take top 3
    return items.sort((a, b) => a.priority - b.priority).slice(0, 3);
  };

  const items = isLoading ? [] : buildItems();

  return (
    <Card className="card-gradient border-border-subtle h-full">
      <Text className="text-white font-bold text-lg mb-4">
        {t('homepage.whats_happening.title')}
      </Text>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
          <Text className="text-white font-medium mb-1">
            {t('homepage.whats_happening.all_good_title')}
          </Text>
          <Text className="text-gray-400 text-sm">
            {t('homepage.whats_happening.all_good_subtitle')}
          </Text>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const config = itemConfig[item.type];
            const Icon = config.icon;

            return (
              <div
                key={index}
                className={`p-4 rounded-xl ${config.bgColor} border ${config.borderColor}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-white/10 shrink-0`}>
                    <Icon className={`w-4 h-4 ${config.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${config.iconColor}`}>
                        {config.label}
                      </span>
                    </div>
                    <Text className="text-white text-sm font-medium leading-relaxed">
                      {item.headline}
                    </Text>
                    {item.detail && (
                      <Text className="text-gray-400 text-xs mt-1">
                        {item.detail}
                      </Text>
                    )}
                    <Link
                      href={item.actionLink}
                      className="inline-flex items-center gap-1 text-accent text-xs mt-2 hover:underline"
                    >
                      {item.actionLabel}
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default WhatsHappening;
