"use client";

/**
 * Historical Trends View Component
 * Displays 90-day trend analysis with seasonality detection and AI insights
 */

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  fetchHistoricalAnalysis,
  HistoricalAnalysisResponse
} from '../../services/insights.service';

interface HistoricalTrendsViewProps {
  startDate: string;
  endDate: string;
  isRTL: boolean;
}

export default function HistoricalTrendsView({
  startDate,
  endDate,
  isRTL
}: HistoricalTrendsViewProps) {
  const [data, setData] = useState<HistoricalAnalysisResponse | null>(null);
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
        const result = await fetchHistoricalAnalysis(lookbackDays);
        setData(result);
      } catch (err: any) {
        console.error('[Historical Trends] Error:', err);
        setError(err.message || 'Failed to load historical trends');
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
          <p className="font-bold">Error Loading Historical Trends</p>
        </div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No historical data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Analysis Card */}
      <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-xl p-6 shadow-lg">
        <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <TrendingUp className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-blue-200">Historical Trend Analysis</h2>
        </div>
        <div className={`prose prose-invert max-w-none ${isRTL ? 'text-right' : 'text-left'}`}>
          <ReactMarkdown>{data.analysis}</ReactMarkdown>
        </div>
      </div>

      {/* Trend Metrics Summary */}
      {data.data && data.data.trend_metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Trend Direction */}
          <div className="bg-card-bg/60 border border-border-subtle rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Trend Direction</div>
            <div className="flex items-center gap-2">
              {data.data.trend_metrics.trend_direction.toLowerCase().includes('up') ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
              <div className="text-xl font-bold">
                {data.data.trend_metrics.trend_direction}
              </div>
            </div>
          </div>

          {/* Best Day */}
          <div className="bg-card-bg/60 border border-border-subtle rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Best Day</div>
            <div className="text-xl font-bold text-green-400">
              {data.data.trend_metrics.best_day}
            </div>
          </div>

          {/* Worst Day */}
          <div className="bg-card-bg/60 border border-border-subtle rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Worst Day</div>
            <div className="text-xl font-bold text-red-400">
              {data.data.trend_metrics.worst_day}
            </div>
          </div>
        </div>
      )}

      {/* Weekly Trends Table */}
      {data.data && data.data.weekly_trends && data.data.weekly_trends.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Weekly Performance Trends</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Week Start</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Spend</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Conversions</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">ROAS</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">WoW Change</th>
                </tr>
              </thead>
              <tbody>
                {data.data.weekly_trends.slice(-8).reverse().map((week, idx) => (
                  <tr key={idx} className="border-b border-border-subtle/50 hover:bg-card-bg/60">
                    <td className="py-3 px-4 text-sm">
                      {new Date(week.week_start).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      ${(week.spend ?? 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      {week.conversions ?? 0}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      {(week.roas ?? 0).toFixed(2)}x
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${
                      (week.wow_change_pct ?? 0) > 0 ? 'text-green-400' : (week.wow_change_pct ?? 0) < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {(week.wow_change_pct ?? 0) > 0 ? '+' : ''}{(week.wow_change_pct ?? 0).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Day of Week Seasonality */}
      {data.data && data.data.daily_seasonality && data.data.daily_seasonality.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Day-of-Week Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {data.data.daily_seasonality.map((day) => (
              <div
                key={day.day_of_week}
                className="bg-card-bg/60 border border-border-subtle rounded-lg p-3"
              >
                <div className="text-sm font-semibold mb-2">{day.day_name}</div>
                <div className="text-xs text-gray-400 mb-1">CTR</div>
                <div className="text-sm font-bold text-blue-400 mb-2">
                  {(day.avg_ctr ?? 0).toFixed(2)}%
                </div>
                <div className="text-xs text-gray-400 mb-1">ROAS</div>
                <div className="text-sm font-bold text-green-400">
                  {(day.avg_roas ?? 0).toFixed(2)}x
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      {data.metadata && (
        <div className="text-center text-xs text-gray-500">
          ✨ Analyzed {data.metadata.lookback_days} days of historical data • Generated at{' '}
          {new Date(data.metadata.generated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
