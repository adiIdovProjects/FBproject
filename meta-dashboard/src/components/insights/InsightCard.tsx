/**
 * InsightCard Component
 * Displays 2-3 quick AI-generated insights as a compact card
 */

import React from 'react';
import { useTranslations } from 'next-intl';

export interface InsightItem {
  type: string; // "opportunity", "alert", "trend", "suggestion"
  icon: string; // Emoji
  text: string;
  priority?: string | null;
}

interface InsightCardProps {
  insights: InsightItem[];
  isLoading: boolean;
  isRTL?: boolean;
}

export default function InsightCard({ insights, isLoading, isRTL = false }: InsightCardProps) {
  const t = useTranslations();

  if (isLoading) {
    return (
      <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-5">
        <div className="h-4 w-32 bg-gray-700 rounded animate-pulse mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gray-700 rounded animate-pulse"></div>
              <div className="flex-1 h-4 bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-xl p-5 shadow-lg">
      <div className={`flex items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <h3 className="text-sm font-semibold text-indigo-200">
          {t('quick_insights')}
        </h3>
        <span className="text-indigo-400/60 text-xs">✨ AI-Powered</span>
      </div>

      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : 'flex-row'}`}
          >
            <span className="text-xl flex-shrink-0 mt-0.5">{insight.icon}</span>
            <p className="text-sm text-gray-200 leading-relaxed flex-1">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
