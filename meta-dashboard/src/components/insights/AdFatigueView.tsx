"use client";

/**
 * Ad Fatigue View Component
 * Displays creative fatigue alerts categorized by severity with refresh recommendations
 */

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { AlertTriangle, AlertCircle, Clock, TrendingDown } from 'lucide-react';
import {
  fetchCreativeFatigue,
  CreativeFatigueResponse
} from '../../services/insights.service';

interface AdFatigueViewProps {
  startDate: string;
  endDate: string;
  isRTL: boolean;
}

export default function AdFatigueView({
  startDate,
  endDate,
  isRTL
}: AdFatigueViewProps) {
  const locale = useLocale();
  const [data, setData] = useState<CreativeFatigueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate lookback days from date range (max 90 days)
  const lookbackDays = Math.min(
    Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)),
    90
  );

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchCreativeFatigue(lookbackDays, locale);
        setData(result);
      } catch (err: any) {
        console.error('[Ad Fatigue] Error:', err);
        setError(err.message || 'Failed to load ad fatigue data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [lookbackDays]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
            <div className="h-6 w-48 bg-gray-700 rounded animate-pulse mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-700 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-400 text-red-300 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-5 h-5" />
          <p className="font-bold">Error Loading Ad Fatigue Data</p>
        </div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // No data or no fatigue detected
  if (!data || !data.summary || data.summary.total_fatigued === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-8 inline-block">
          <AlertCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <p className="text-green-300 font-semibold text-lg">No Ad Fatigue Detected</p>
          <p className="text-gray-400 text-sm mt-2">All creatives are performing well!</p>
        </div>
      </div>
    );
  }

  // Helper function to render creative card
  const renderCreativeCard = (creative: any, severity: 'critical' | 'warning' | 'monitor') => {
    const severityConfig = {
      critical: {
        bgColor: 'bg-red-900/30',
        borderColor: 'border-red-500/50',
        icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
        label: 'CRITICAL',
        labelColor: 'text-red-400'
      },
      warning: {
        bgColor: 'bg-orange-900/30',
        borderColor: 'border-orange-500/50',
        icon: <TrendingDown className="w-5 h-5 text-orange-400" />,
        label: 'WARNING',
        labelColor: 'text-orange-400'
      },
      monitor: {
        bgColor: 'bg-yellow-900/30',
        borderColor: 'border-yellow-500/50',
        icon: <Clock className="w-5 h-5 text-yellow-400" />,
        label: 'MONITOR',
        labelColor: 'text-yellow-400'
      }
    };

    const config = severityConfig[severity];

    return (
      <div
        key={creative.creative_id}
        className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {config.icon}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold ${config.labelColor}`}>
                  {config.label}
                </span>
                <span className="text-xs text-gray-500">
                  Creative #{creative.creative_id}
                </span>
              </div>
              <div className="text-sm font-semibold mb-2 truncate">
                {creative.title || 'Untitled Creative'}
              </div>
              <div className="flex gap-6 text-xs">
                <div>
                  <span className="text-gray-400">Initial CTR: </span>
                  <span className="font-semibold">{creative.initial_ctr.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Recent CTR: </span>
                  <span className="font-semibold">{creative.recent_ctr.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Decline: </span>
                  <span className={`font-semibold ${config.labelColor}`}>
                    {creative.fatigue_pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-500/30 rounded-xl p-6 shadow-lg">
        <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <AlertTriangle className="w-6 h-6 text-orange-400" />
          <h2 className="text-2xl font-bold text-orange-200">Ad Fatigue Alert Summary</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card-bg/40 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total Fatigued</div>
            <div className="text-3xl font-bold">{data.summary.total_fatigued}</div>
          </div>
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Critical</div>
            <div className="text-3xl font-bold text-red-400">{data.summary.critical_count}</div>
            <div className="text-xs text-gray-400 mt-1">&gt;30% decline</div>
          </div>
          <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Warning</div>
            <div className="text-3xl font-bold text-orange-400">{data.summary.warning_count}</div>
            <div className="text-xs text-gray-400 mt-1">20-30% decline</div>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Monitor</div>
            <div className="text-3xl font-bold text-yellow-400">{data.summary.monitor_count}</div>
            <div className="text-xs text-gray-400 mt-1">15-20% decline</div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Recommended Actions</h3>
          <div className="space-y-2">
            {data.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <p className="text-sm text-gray-200">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical Refreshes */}
      {data.critical_refreshes && data.critical_refreshes.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-bold">Critical: Urgent Refresh Needed</h3>
            <span className="ml-auto text-sm text-gray-400">
              {data.critical_refreshes.length} creatives
            </span>
          </div>
          <div className="space-y-3">
            {data.critical_refreshes.map((creative) =>
              renderCreativeCard(creative, 'critical')
            )}
          </div>
        </div>
      )}

      {/* Warning Refreshes */}
      {data.warning_refreshes && data.warning_refreshes.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-bold">Warning: Plan Refresh Soon</h3>
            <span className="ml-auto text-sm text-gray-400">
              {data.warning_refreshes.length} creatives
            </span>
          </div>
          <div className="space-y-3">
            {data.warning_refreshes.map((creative) =>
              renderCreativeCard(creative, 'warning')
            )}
          </div>
        </div>
      )}

      {/* Monitor Closely */}
      {data.monitor_closely && data.monitor_closely.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-bold">Monitor: Watch Closely</h3>
            <span className="ml-auto text-sm text-gray-400">
              {data.monitor_closely.length} creatives
            </span>
          </div>
          <div className="space-y-3">
            {data.monitor_closely.map((creative) =>
              renderCreativeCard(creative, 'monitor')
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500">
        ✨ Analyzed {lookbackDays} days of performance data
      </div>
    </div>
  );
}
