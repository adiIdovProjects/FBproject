"use client";

import React from 'react';
import { Card } from '@tremor/react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Loader2, Lightbulb, ArrowRight, TrendingUp, TrendingDown, Pause, Play } from 'lucide-react';
import { fetchCampaignAnalysis } from '@/services/insights.service';
import { useAccount } from '@/context/AccountContext';
import { formatDate, calculateDateRange } from '@/utils/date';

interface ActionableRecommendationsProps {
  locale?: string;
}

const ActionableRecommendations: React.FC<ActionableRecommendationsProps> = ({ locale = 'en' }) => {
  const t = useTranslations();
  const router = useRouter();
  const { selectedAccountId } = useAccount();

  // Calculate date range - last 14 days for recommendations
  const range = calculateDateRange('last_14_days');
  const startDate = formatDate(range.start) || '';
  const endDate = formatDate(range.end) || '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['campaign-analysis', startDate, endDate, selectedAccountId, locale],
    queryFn: () => fetchCampaignAnalysis({ startDate, endDate }, selectedAccountId, locale),
    enabled: !!startDate && !!endDate && !!selectedAccountId,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="card-gradient border-border-subtle">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="card-gradient border-border-subtle">
        <div className="p-4 text-center">
          <p className="text-gray-400 text-sm">{t('performance.no_recommendations')}</p>
        </div>
      </Card>
    );
  }

  // Extract actionable recommendations from scale and fix candidates
  const recommendations: Array<{
    type: 'scale' | 'fix' | 'pause';
    icon: React.ElementType;
    title: string;
    description: string;
    action: string;
    route?: string;
    color: string;
  }> = [];

  // Add scale candidates
  if (data.data.scale_candidates?.length > 0) {
    const top = data.data.scale_candidates[0];
    recommendations.push({
      type: 'scale',
      icon: TrendingUp,
      title: t('performance.rec_scale_title'),
      description: t('performance.rec_scale_desc', { name: top.campaign_name || 'campaign', roas: top.roas?.toFixed(2) || 'high' }),
      action: t('performance.rec_scale_action'),
      route: `/${locale}/campaign-control`,
      color: 'bg-green-500/20 border-green-500/30 text-green-400',
    });
  }

  // Add fix candidates
  if (data.data.fix_candidates?.length > 0) {
    const top = data.data.fix_candidates[0];
    recommendations.push({
      type: 'fix',
      icon: TrendingDown,
      title: t('performance.rec_fix_title'),
      description: t('performance.rec_fix_desc', { name: top.campaign_name || 'campaign' }),
      action: t('performance.rec_fix_action'),
      route: `/${locale}/campaign-control`,
      color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    });
  }

  // If no specific recommendations, show a general tip
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'scale',
      icon: Lightbulb,
      title: t('performance.rec_general_title'),
      description: t('performance.rec_general_desc'),
      action: t('performance.rec_general_action'),
      route: `/${locale}/insights`,
      color: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    });
  }

  return (
    <Card className="card-gradient border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">{t('performance.what_to_do')}</h3>
          <p className="text-gray-400 text-xs">{t('performance.ai_recommendations')}</p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="divide-y divide-white/5">
        {recommendations.slice(0, 3).map((rec, idx) => {
          const Icon = rec.icon;
          return (
            <button
              key={idx}
              onClick={() => rec.route && router.push(rec.route)}
              className="w-full flex items-start gap-4 p-4 hover:bg-white/5 transition-colors text-left group"
            >
              <div className={`w-10 h-10 rounded-lg ${rec.color} flex items-center justify-center shrink-0 border`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white mb-0.5">{rec.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{rec.description}</p>
              </div>
              <div className="flex items-center gap-1 text-accent text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {rec.action}
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default ActionableRecommendations;
