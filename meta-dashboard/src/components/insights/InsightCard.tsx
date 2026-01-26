/**
 * InsightCard Component
 * Displays 2-3 quick AI-generated insights as a compact card
 */

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useTheme } from '../../context/ThemeContext';

export interface InsightItem {
  type: string; // "opportunity", "alert", "trend", "suggestion"
  icon: string; // Emoji
  text: string;
  priority?: string | null; // "critical", "warning", "opportunity", "info"
}

interface InsightCardProps {
  insights: InsightItem[];
  isLoading: boolean;
  isRTL?: boolean;
}

export default function InsightCard({ insights, isLoading, isRTL = false }: InsightCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { theme } = useTheme();
  const isColorful = theme === 'colorful';

  if (isLoading) {
    return (
      <div className="bg-card/40 border border-border-subtle rounded-xl p-5">
        <div className="h-4 w-32 bg-secondary rounded animate-pulse mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-secondary rounded animate-pulse"></div>
              <div className="flex-1 h-4 bg-secondary rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return null;
  }

  // Determine border color based on highest priority insight
  const getHighestPriority = () => {
    const priorities = insights.map(i => i.priority).filter(Boolean);
    if (priorities.includes('critical')) return 'critical';
    if (priorities.includes('warning')) return 'warning';
    if (priorities.includes('opportunity')) return 'opportunity';
    return 'info';
  };

  const highestPriority = getHighestPriority();

  // Theme-aware color classes
  const borderColorClass = isColorful
    ? {
        critical: 'border-[#FF6B6B]/50',
        warning: 'border-[#FFD700]/50',
        opportunity: 'border-[#00F5D4]/50',
        info: 'border-[#00D4FF]/30'
      }[highestPriority]
    : {
        critical: 'border-red-500/50',
        warning: 'border-orange-500/50',
        opportunity: 'border-green-500/50',
        info: 'border-indigo-500/20'
      }[highestPriority];

  const gradientClass = isColorful
    ? {
        critical: 'from-[#FF6B6B]/20 to-[#FF6B6B]/10',
        warning: 'from-[#FFD700]/20 to-[#FFD700]/10',
        opportunity: 'from-[#00F5D4]/20 to-[#00F5D4]/10',
        info: 'from-[#00D4FF]/20 to-[#A855F7]/20'
      }[highestPriority]
    : {
        critical: 'from-red-900/30 to-red-800/20',
        warning: 'from-orange-900/30 to-yellow-900/20',
        opportunity: 'from-green-900/30 to-emerald-900/20',
        info: 'from-indigo-900/30 to-purple-900/30'
      }[highestPriority];

  return (
    <div className={`bg-gradient-to-br ${gradientClass} border ${borderColorClass} rounded-xl p-5 shadow-lg ${isColorful ? 'border-glow' : ''}`}>
      <div className={`flex items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <h3 className={`text-sm font-semibold ${isColorful ? 'text-[#8EC5FC]' : 'text-indigo-200'}`}>
          {t('dashboard.quick_insights')}
        </h3>
        <span className={`text-xs ${isColorful ? 'text-[#00D4FF]/60' : 'text-indigo-400/60'}`}>✨ AI-Powered</span>
      </div>

      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : 'flex-row'}`}
          >
            <span className="text-xl flex-shrink-0 mt-0.5">{insight.icon}</span>
            <p className="text-sm text-foreground leading-relaxed flex-1">{insight.text}</p>
          </div>
        ))}
      </div>

      {/* View Full Analysis Button */}
      <div className={`mt-4 pt-4 border-t border-white/10 ${isRTL ? 'text-right' : 'text-left'}`}>
        <Link
          href={`/${locale}/insights`}
          className={`inline-flex items-center gap-2 text-xs font-medium transition-colors ${isColorful ? 'text-[#00D4FF] hover:text-[#00F5D4]' : 'text-indigo-300 hover:text-indigo-200'}`}
        >
          <span>{t('dashboard.view_full_analysis') || 'View Full Analysis'}</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
