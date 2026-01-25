"use client";

/**
 * SimpleRecommendations Component
 * Shows actionable recommendations from AI insights AND campaign health issues
 */

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, Text } from '@tremor/react';
import { Lightbulb, ChevronRight, Loader2, AlertTriangle, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { fetchInsightsSummary } from '../../services/insights.service';
import { fetchCampaignsWithComparison } from '../../services/campaigns.service';
import { formatDate, calculateDateRange } from '../../utils/date';
import { getCampaignHealth } from './SimpleCampaignList';
import { CampaignRow } from '../../types/campaigns.types';

interface SimpleRecommendationsProps {
  accountId: string | null;
}

// Unified recommendation type
interface Recommendation {
  type: 'warning' | 'problem' | 'opportunity' | 'success' | 'default';
  text: string;
  actionLink: string;
  actionLabel: string;
}

// Map insight types to icons and actions
const insightConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bgColor: 'bg-yellow-900/20' },
  problem: { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-900/20' },
  opportunity: { icon: TrendingUp, color: 'text-green-400', bgColor: 'bg-green-900/20' },
  success: { icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-900/20' },
  default: { icon: Lightbulb, color: 'text-blue-400', bgColor: 'bg-blue-900/20' },
};

// Helper: get action link from text
function getActionLinkFromText(text: string, locale: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('creative') || lowerText.includes('ad') || lowerText.includes('fatigue')) {
    return `/${locale}/uploader/add-creative`;
  }
  if (lowerText.includes('budget') || lowerText.includes('scale') || lowerText.includes('spend')) {
    return `/${locale}/campaign-control`;
  }
  if (lowerText.includes('campaign')) {
    return `/${locale}/campaigns`;
  }
  return `/${locale}/insights`;
}

const SimpleRecommendations: React.FC<SimpleRecommendationsProps> = ({ accountId }) => {
  const t = useTranslations();
  const locale = useLocale();

  // Get date ranges
  const dateRange7 = calculateDateRange('last_7_days');
  const dateRange30 = calculateDateRange('last_30_days');
  const startDate7 = formatDate(dateRange7.start) || '';
  const endDate7 = formatDate(dateRange7.end) || '';
  const startDate30 = formatDate(dateRange30.start) || '';
  const endDate30 = formatDate(dateRange30.end) || '';

  // Fetch AI insights
  const { data: insights, isLoading: isInsightsLoading } = useQuery({
    queryKey: ['homepage-recommendations', startDate7, endDate7, accountId, locale],
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

  // Fetch campaigns for health-based recommendations
  const { data: campaigns, isLoading: isCampaignsLoading } = useQuery({
    queryKey: ['homepage-campaigns-health', startDate30, endDate30, accountId],
    queryFn: () => fetchCampaignsWithComparison(
      { startDate: startDate30, endDate: endDate30 },
      ['ACTIVE'], // Only active campaigns
      '',
      'spend',
      'desc',
      accountId
    ),
    enabled: !!startDate30 && !!endDate30,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = isInsightsLoading || isCampaignsLoading;

  // Generate campaign health recommendations
  const generateCampaignRecommendations = (campaignList: CampaignRow[]): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    for (const campaign of campaignList) {
      const health = getCampaignHealth(campaign);

      if (health.status === 'problem') {
        recommendations.push({
          type: 'problem',
          text: t('homepage.recommendations.campaign_problem', { name: campaign.campaign_name }),
          actionLink: `/${locale}/uploader/add-creative`,
          actionLabel: t('homepage.recommendations.add_creatives'),
        });
      } else if (health.status === 'attention') {
        if (health.reason === 'low_ctr') {
          recommendations.push({
            type: 'warning',
            text: t('homepage.recommendations.campaign_low_ctr', { name: campaign.campaign_name }),
            actionLink: `/${locale}/uploader/add-creative`,
            actionLabel: t('homepage.recommendations.add_creatives'),
          });
        } else if (health.reason === 'no_conversions') {
          recommendations.push({
            type: 'warning',
            text: t('homepage.recommendations.campaign_no_conversions', { name: campaign.campaign_name }),
            actionLink: `/${locale}/campaigns`,
            actionLabel: t('homepage.recommendations.view_details'),
          });
        }
      }
    }

    return recommendations;
  };

  // Combine AI insights and campaign recommendations
  const allRecommendations: Recommendation[] = [];

  // Add campaign health recommendations first (more actionable)
  if (campaigns) {
    allRecommendations.push(...generateCampaignRecommendations(campaigns));
  }

  // Add AI insights
  if (insights) {
    for (const insight of insights) {
      const validTypes = ['warning', 'problem', 'opportunity', 'success', 'default'] as const;
      const insightType = validTypes.includes(insight.type as typeof validTypes[number])
        ? (insight.type as Recommendation['type'])
        : 'default';

      allRecommendations.push({
        type: insightType,
        text: insight.text,
        actionLink: getActionLinkFromText(insight.text, locale),
        actionLabel: t('homepage.recommendations.view_details'),
      });
    }
  }

  // Take top 3 recommendations
  const topRecommendations = allRecommendations.slice(0, 3);

  return (
    <Card className="card-gradient border-border-subtle">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-accent" />
        <Text className="text-white font-bold text-lg">
          {t('homepage.recommendations.title')}
        </Text>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        </div>
      ) : topRecommendations.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <Text className="text-gray-400 text-sm">
            {t('homepage.recommendations.no_recommendations')}
          </Text>
        </div>
      ) : (
        <div className="space-y-3">
          {topRecommendations.map((rec, index) => {
            const config = insightConfig[rec.type] || insightConfig.default;
            const Icon = config.icon;

            return (
              <div
                key={index}
                className={`p-3 rounded-xl ${config.bgColor} border border-white/5`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 ${config.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <Text className="text-gray-200 text-sm leading-relaxed">
                      {rec.text}
                    </Text>
                    <Link
                      href={rec.actionLink}
                      className="inline-flex items-center gap-1 text-accent text-xs mt-2 hover:underline"
                    >
                      {rec.actionLabel}
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

export default SimpleRecommendations;
