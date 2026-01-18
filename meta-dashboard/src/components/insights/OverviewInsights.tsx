"use client";

/**
 * OverviewInsights Component
 * Shows daily/weekly/monthly insights as cards
 */

import { useTranslations } from 'next-intl';
import { PeriodInsight } from '../../services/insights.service';
import { Calendar } from 'lucide-react';

interface OverviewInsightsProps {
  daily: PeriodInsight;
  weekly: PeriodInsight;
  monthly: PeriodInsight;
  isRTL: boolean;
}

function InsightCard({
  insight,
  title,
  isRTL,
  convLabel
}: {
  insight: PeriodInsight;
  title: string;
  isRTL: boolean;
  convLabel: string;
}) {
  return (
    <div className="rounded-xl border p-4 bg-card-bg/40 border-border-subtle text-gray-200">
      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
        <Calendar className="w-4 h-4 text-gray-400" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>

      <p className={`text-sm leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
        {insight.insight}
      </p>

      {insight.metrics && insight.status === 'ok' && (
        <div className={`mt-3 pt-3 border-t border-border-subtle flex gap-4 text-xs text-gray-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span>${insight.metrics.spend?.toFixed(0) || 0}</span>
          <span>{insight.metrics.conversions || 0} {convLabel}</span>
          {insight.metrics.cpa && <span>CPA ${insight.metrics.cpa.toFixed(2)}</span>}
          {insight.metrics.roas && <span>ROAS {insight.metrics.roas.toFixed(1)}x</span>}
        </div>
      )}
    </div>
  );
}

export default function OverviewInsights({ daily, weekly, monthly, isRTL }: OverviewInsightsProps) {
  const t = useTranslations();

  // For RTL: show monthly first (right), then weekly, then daily (left)
  // For LTR: show daily first (left), then weekly, then monthly (right)
  const cards = isRTL ? [
    { insight: monthly, title: monthly.period_label || t('date.this_month') },
    { insight: weekly, title: weekly.period_label || t('insights.this_week') },
    { insight: daily, title: daily.period_label || t('date.yesterday') }
  ] : [
    { insight: daily, title: daily.period_label || t('date.yesterday') },
    { insight: weekly, title: weekly.period_label || t('insights.this_week') },
    { insight: monthly, title: monthly.period_label || t('date.this_month') }
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 ${isRTL ? 'direction-rtl' : ''}`}>
      {cards.map((card, idx) => (
        <InsightCard
          key={idx}
          insight={card.insight}
          title={card.title}
          isRTL={isRTL}
          convLabel={t('insights.conv')}
        />
      ))}
    </div>
  );
}
