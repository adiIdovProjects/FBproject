"use client";

/**
 * Historical Trends View Component
 * Displays 90-day trend analysis with seasonality detection and AI insights
 */

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  fetchHistoricalAnalysis,
  HistoricalAnalysisResponse
} from '../../services/insights.service';

interface HistoricalTrendsViewProps {
  startDate: string;
  endDate: string;
  isRTL: boolean;
  accountId?: string;
}

export default function HistoricalTrendsView({
  startDate,
  endDate,
  isRTL,
  accountId
}: HistoricalTrendsViewProps) {
  const t = useTranslations();
  const locale = useLocale();

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
        const result = await fetchHistoricalAnalysis(lookbackDays, undefined, locale, accountId);
        setData(result);
      } catch (err: any) {
        console.error('[Historical Trends] Error:', err);
        setError(err.message || 'Failed to load historical trends');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [lookbackDays, accountId, locale]);

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
          <p className="font-bold">{t('insights.error_loading_historical')}</p>
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
        <p className="text-gray-400">{t('insights.no_historical_data')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Analysis Card */}
      <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-xl p-6 shadow-lg">
        <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row'}`}>
          <TrendingUp className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-blue-200">{t('insights.historical_trend_analysis')}</h2>
        </div>
        <div className={`prose prose-invert max-w-none ${isRTL ? 'text-right' : 'text-left'}`}>
          <ReactMarkdown>{data.analysis}</ReactMarkdown>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      {data.data && data.data.weekly_trends && data.data.weekly_trends.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">{t('insights.weekly_conversions_trend')}</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.data.weekly_trends.map(week => ({
                  week: new Date(week.week_start).toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
                  conversions: week.conversions || 0,
                  spend: week.spend || 0
                }))}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="week"
                  stroke="#475569"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value: number, name: string) => [
                    name === 'conversions' ? value : `$${value.toFixed(2)}`,
                    name === 'conversions' ? t('metrics.conversions') : t('metrics.spend')
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Day of Week Seasonality */}
      {data.data && data.data.daily_seasonality && data.data.daily_seasonality.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">{t('insights.day_of_week_performance')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {data.data.daily_seasonality.map((day) => (
              <div
                key={day.day_of_week}
                className="bg-card-bg/60 border border-border-subtle rounded-lg p-3"
              >
                <div className="text-sm font-semibold mb-2">{day.day_name}</div>
                <div className="text-xs text-gray-400 mb-1">{t('metrics.ctr')}</div>
                <div className="text-sm font-bold text-blue-400 mb-2">
                  {(day.avg_ctr ?? 0).toFixed(2)}%
                </div>
                <div className="text-xs text-gray-400 mb-1">{t('metrics.roas')}</div>
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
          ✨ {t('insights.analyzed_days', { days: data.metadata.lookback_days })} • {t('insights.generated_at')}{' '}
          {new Date(data.metadata.generated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
