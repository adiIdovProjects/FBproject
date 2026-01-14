"use client";

/**
 * OverviewInsights Component
 * Shows daily/weekly/monthly insights as cards with color indicators
 */

import { PeriodInsight } from '../../services/insights.service';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface OverviewInsightsProps {
  daily: PeriodInsight;
  weekly: PeriodInsight;
  monthly: PeriodInsight;
  isRTL: boolean;
}

const colorClasses = {
  green: 'bg-green-900/30 border-green-500/50 text-green-300',
  yellow: 'bg-yellow-900/30 border-yellow-500/50 text-yellow-300',
  red: 'bg-red-900/30 border-red-500/50 text-red-300',
  gray: 'bg-gray-800/30 border-gray-500/50 text-gray-400'
};

const iconColors = {
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  gray: 'text-gray-500'
};

function InsightCard({
  insight,
  title,
  isRTL
}: {
  insight: PeriodInsight;
  title: string;
  isRTL: boolean;
}) {
  const color = insight.color || 'gray';

  const TrendIcon = color === 'green' ? TrendingUp :
                    color === 'red' ? TrendingDown :
                    Minus;

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Calendar className={`w-4 h-4 ${iconColors[color]}`} />
        <h3 className="font-semibold text-sm">{title}</h3>
        <TrendIcon className={`w-4 h-4 ${iconColors[color]} ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
      </div>

      <p className={`text-sm leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
        {insight.insight}
      </p>

      {insight.metrics && insight.status === 'ok' && (
        <div className={`mt-3 pt-3 border-t border-current/20 flex gap-4 text-xs opacity-75 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span>${insight.metrics.spend?.toFixed(0) || 0}</span>
          <span>{insight.metrics.conversions || 0} conv</span>
          {insight.metrics.cpa && <span>CPA ${insight.metrics.cpa.toFixed(2)}</span>}
          {insight.metrics.roas && <span>ROAS {insight.metrics.roas.toFixed(1)}x</span>}
        </div>
      )}
    </div>
  );
}

export default function OverviewInsights({ daily, weekly, monthly, isRTL }: OverviewInsightsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <InsightCard
        insight={daily}
        title={daily.period_label || 'Yesterday'}
        isRTL={isRTL}
      />
      <InsightCard
        insight={weekly}
        title={weekly.period_label || 'This Week'}
        isRTL={isRTL}
      />
      <InsightCard
        insight={monthly}
        title={monthly.period_label || 'This Month'}
        isRTL={isRTL}
      />
    </div>
  );
}
