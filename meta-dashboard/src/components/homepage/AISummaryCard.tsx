"use client";

import React from 'react';
import { Card } from '@tremor/react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Bot, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { fetchOverviewSummary, PeriodInsight, ImprovementCheck } from '@/services/insights.service';
import { useAccount } from '@/context/AccountContext';

const colorMap = {
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  gray: 'text-gray-400',
};

const StatusBadge: React.FC<{ check: ImprovementCheck }> = ({ check }) => {
  const statusColors = {
    excellent: 'bg-green-500/20 text-green-400 border-green-500/30',
    good: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const StatusIcon = check.status === 'warning' || check.status === 'critical' ? AlertTriangle : CheckCircle;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${statusColors[check.status]}`}>
      <StatusIcon className="w-3.5 h-3.5" />
      <span>{check.message}</span>
    </div>
  );
};

const PeriodRow: React.FC<{ period: PeriodInsight; label: string }> = ({ period, label }) => {
  if (period.status === 'no_data') {
    return (
      <div className="flex items-start gap-3 py-2">
        <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
        <span className="text-xs text-gray-500">No data</span>
      </div>
    );
  }

  const TrendIcon = period.color === 'green' ? TrendingUp : period.color === 'red' ? TrendingDown : Minus;

  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-400 w-16 shrink-0 font-medium">{label}</span>
      <div className="flex-1">
        <p className={`text-sm ${colorMap[period.color]} leading-relaxed`}>
          {period.insight}
        </p>
      </div>
      <TrendIcon className={`w-4 h-4 shrink-0 ${colorMap[period.color]}`} />
    </div>
  );
};

interface AISummaryCardProps {
  locale?: string;
}

const AISummaryCard: React.FC<AISummaryCardProps> = ({ locale = 'en' }) => {
  const t = useTranslations();
  const { selectedAccountId } = useAccount();

  const { data, isLoading, error } = useQuery({
    queryKey: ['overview-summary', selectedAccountId, locale],
    queryFn: () => fetchOverviewSummary(selectedAccountId, locale),
    enabled: !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="card-gradient border-border-subtle">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="card-gradient border-border-subtle">
        <div className="flex items-center gap-3 p-4">
          <Bot className="w-6 h-6 text-gray-500" />
          <p className="text-gray-400 text-sm">{t('homepage2.ai_summary.no_data')}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="card-gradient border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">{t('homepage2.ai_summary.title')}</h3>
          <p className="text-gray-400 text-xs">{t('homepage2.ai_summary.subtitle')}</p>
        </div>
      </div>

      {/* Period Insights */}
      <div className="p-4 space-y-1">
        <PeriodRow period={data.daily} label={t('homepage2.ai_summary.daily')} />
        <PeriodRow period={data.weekly} label={t('homepage2.ai_summary.weekly')} />
        <PeriodRow period={data.monthly} label={t('homepage2.ai_summary.monthly')} />
      </div>

      {/* TL;DR Summary Bullets */}
      {data.summary && data.summary.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">{t('homepage2.ai_summary.tldr')}</p>
          <ul className="space-y-1.5">
            {data.summary.map((item, idx) => (
              <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvement Checks */}
      {data.improvement_checks && data.improvement_checks.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {data.improvement_checks.map((check, idx) => (
              <StatusBadge key={idx} check={check} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default AISummaryCard;
