"use client";

/**
 * Creative Analysis View Component
 * Displays creative theme performance, CTA effectiveness, and winning patterns
 */

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Palette, Target, TrendingUp, AlertCircle, AlertTriangle, TrendingDown, Clock, Image, Video, LayoutGrid } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  fetchCreativeAnalysis,
  fetchCreativeFatigue,
  CreativeAnalysisResponse,
  CreativeFatigueResponse
} from '../../services/insights.service';

interface CreativeAnalysisViewProps {
  startDate: string;
  endDate: string;
  isRTL: boolean;
  accountId?: string;
}

export default function CreativeAnalysisView({
  startDate,
  endDate,
  isRTL,
  accountId
}: CreativeAnalysisViewProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [analysisData, setAnalysisData] = useState<CreativeAnalysisResponse | null>(null);
  const [fatigueData, setFatigueData] = useState<CreativeFatigueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate lookback days for fatigue (default 30 or derived)
  const lookbackDays = Math.min(
    Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)),
    90
  ) || 30;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [analysisResult, fatigueResult] = await Promise.all([
          fetchCreativeAnalysis({ startDate, endDate }, undefined, locale, accountId),
          fetchCreativeFatigue(lookbackDays, locale, accountId)
        ]);
        setAnalysisData(analysisResult);
        setFatigueData(fatigueResult);
      } catch (err: any) {
        console.error('[Creative Analysis] Error:', err);
        setError(err.message || 'Failed to load creative analysis');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, locale, lookbackDays, accountId]);

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
          <p className="font-bold">{t('insights.error_loading_creative')}</p>
        </div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // No data state
  if (!analysisData) {
    return (
      <div className="text-center py-12">
        <Palette className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">{t('insights.no_creative_data')}</p>
      </div>
    );
  }

  // Check if we have ROAS data (any top performer or theme with ROAS > 0)
  const hasRoas = analysisData.data?.top_performers?.some((c: any) => c.roas > 0) ||
    Object.values(analysisData.data?.theme_performance || {}).some((t: any) => t.overall_roas > 0);

  return (
    <div className="space-y-6">
      {/* AI Analysis Card */}
      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-xl p-6 shadow-lg">
        <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row'}`}>
          <Palette className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-purple-200">{t('insights.creative_insights')}</h2>
        </div>
        <div className={`prose prose-invert max-w-none ${isRTL ? 'text-right' : 'text-left'}`}>
          <ReactMarkdown>{analysisData.analysis}</ReactMarkdown>
        </div>
      </div>

      {/* Summary Stats */}
      {analysisData.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card-bg/60 border border-border-subtle rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">{t('insights.total_creatives_analyzed')}</div>
            <div className="text-2xl font-bold">{analysisData.data.total_creatives || 0}</div>
          </div>

          <div className="bg-card-bg/60 border border-border-subtle rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">{t('insights.themes_detected')}</div>
            <div className="text-2xl font-bold">
              {Object.keys(analysisData.data.theme_performance || {}).length}
            </div>
          </div>

          <div className="bg-card-bg/60 border border-border-subtle rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">{t('insights.fatigued_creatives')}</div>
            <div className="text-2xl font-bold text-red-400">
              {analysisData.data.fatigued_creatives_count || 0}
            </div>
          </div>
        </div>
      )}

      {/* Theme Performance */}
      {analysisData.data && analysisData.data.theme_performance && Object.keys(analysisData.data.theme_performance).length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold">{t('insights.theme_performance')}</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            {t('insights.theme_description')}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">{t('insights.theme')}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">{t('insights.ads')}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">{t('metrics.spend')}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">{t('metrics.ctr')}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">{t('insights.conv')}</th>
                  {hasRoas && (
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">{t('metrics.roas')}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {Object.entries(analysisData.data.theme_performance)
                  .sort(([, a], [, b]) => b.avg_ctr - a.avg_ctr)
                  .map(([theme, stats]) => (
                    <tr key={theme} className="border-b border-border-subtle/50 hover:bg-card-bg/60">
                      <td className="py-3 px-4 text-sm font-medium capitalize">
                        {t(`insights.themes.${theme}`) || theme.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {stats.creative_count}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        ${stats.total_spend.toFixed(2)}
                      </td>
                      <td className={`py-3 px-4 text-sm text-right font-semibold ${stats.avg_ctr >= 2 ? 'text-green-400' : stats.avg_ctr >= 1 ? 'text-yellow-400' : 'text-gray-200'}`}>
                        {stats.avg_ctr.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {stats.total_conversions}
                      </td>
                      {hasRoas && (
                        <td className={`py-3 px-4 text-sm text-right font-semibold ${stats.overall_roas >= 2 ? 'text-green-400' : stats.overall_roas >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {stats.overall_roas.toFixed(2)}x
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Format Performance (Image vs Video vs Carousel) */}
      {analysisData.data && analysisData.data.format_performance && analysisData.data.format_performance.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold">{t('insights.format_performance')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysisData.data.format_performance.map((format: any) => {
              const FormatIcon = format.format_type === 'Video' ? Video : format.format_type === 'Carousel' ? LayoutGrid : Image;
              return (
                <div
                  key={format.format_type}
                  className="bg-card-bg/60 border border-border-subtle rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <FormatIcon className="w-5 h-5 text-cyan-400" />
                    <span className="font-semibold">{t(`creatives.types.${format.format_type.toLowerCase()}`)}</span>
                    <span className="ml-auto text-xs text-gray-400">{format.creative_count} {t('insights.ads')}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t('metrics.ctr')}</span>
                      <span className={`font-semibold ${format.avg_ctr >= 2 ? 'text-green-400' : format.avg_ctr >= 1 ? 'text-yellow-400' : 'text-gray-200'}`}>
                        {format.avg_ctr.toFixed(2)}%
                      </span>
                    </div>
                    {format.format_type === 'Video' && format.avg_hook_rate > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('insights.hook_rate')}</span>
                        <span className="font-semibold">{format.avg_hook_rate.toFixed(1)}%</span>
                      </div>
                    )}
                    {format.format_type === 'Video' && format.avg_completion_rate > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('insights.view_rate')}</span>
                        <span className="font-semibold">{format.avg_completion_rate.toFixed(1)}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t('metrics.conversions')}</span>
                      <span className="font-semibold">{format.total_conversions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t('metrics.spend')}</span>
                      <span className="font-semibold">${format.total_spend.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Performers */}
      {analysisData.data && analysisData.data.top_performers && analysisData.data.top_performers.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">{t('insights.top_performing_ads')}</h3>
          <div className="space-y-3">
            {analysisData.data.top_performers.map((creative: any, idx: number) => {
              const FormatIcon = creative.format_type === 'Video' ? Video : creative.format_type === 'Carousel' ? LayoutGrid : Image;
              return (
                <div
                  key={`${creative.creative_id}-${idx}`}
                  className="bg-card-bg/60 border border-border-subtle rounded-lg p-4 hover:bg-card-bg/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FormatIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 capitalize">{t(`creatives.types.${(creative.format_type || 'image').toLowerCase()}`)}</span>
                      </div>
                      <div className="text-sm font-semibold mb-1 truncate">
                        {creative.ad_name || creative.title || `Ad #${creative.creative_id}`}
                      </div>
                      <div className="text-xs text-gray-400 line-clamp-2 mb-2">
                        {creative.body}
                      </div>
                    </div>
                    <div className="flex gap-4 text-right flex-shrink-0">
                      <div>
                        <div className="text-xs text-gray-400">{t('metrics.ctr')}</div>
                        <div className={`text-sm font-bold ${creative.ctr >= 2 ? 'text-green-400' : creative.ctr >= 1 ? 'text-yellow-400' : 'text-gray-200'}`}>
                          {creative.ctr.toFixed(2)}%
                        </div>
                      </div>
                      {creative.format_type === 'Video' && creative.hook_rate > 0 && (
                        <div>
                          <div className="text-xs text-gray-400">{t('insights.hook')}</div>
                          <div className="text-sm font-bold">
                            {creative.hook_rate.toFixed(1)}%
                          </div>
                        </div>
                      )}
                      {creative.format_type === 'Video' && creative.completion_rate > 0 && (
                        <div>
                          <div className="text-xs text-gray-400">{t('insights.view')}</div>
                          <div className="text-sm font-bold">
                            {creative.completion_rate.toFixed(1)}%
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-gray-400">{t('insights.conv')}</div>
                        <div className="text-sm font-bold">
                          {creative.conversions}
                        </div>
                      </div>
                      {hasRoas && creative.roas > 0 && (
                        <div>
                          <div className="text-xs text-gray-400">{t('metrics.roas')}</div>
                          <div className="text-sm font-bold text-green-400">
                            {creative.roas.toFixed(2)}x
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- Ad Fatigue Sections (Merged) --- */}

      {/* Fatigue Summary */}
      {fatigueData?.summary && fatigueData.summary.total_fatigued > 0 && (
        <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-500/30 rounded-xl p-6 shadow-lg">
          <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row'}`}>
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            <h2 className="text-2xl font-bold text-orange-200">{t('insights.ad_fatigue_alert')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card-bg/40 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">{t('insights.total_fatigued')}</div>
              <div className="text-3xl font-bold">{fatigueData.summary.total_fatigued}</div>
            </div>
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">{t('insights.critical')}</div>
              <div className="text-3xl font-bold text-red-400">{fatigueData.summary.critical_count}</div>
              <div className="text-xs text-gray-400 mt-1">{t('insights.critical_decline')}</div>
            </div>
            <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">{t('insights.warning')}</div>
              <div className="text-3xl font-bold text-orange-400">{fatigueData.summary.warning_count}</div>
              <div className="text-xs text-gray-400 mt-1">{t('insights.warning_decline')}</div>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">{t('insights.monitor')}</div>
              <div className="text-3xl font-bold text-yellow-400">{fatigueData.summary.monitor_count}</div>
              <div className="text-xs text-gray-400 mt-1">{t('insights.monitor_decline')}</div>
            </div>
          </div>

          {/* Recommendations */}
          {fatigueData.recommendations && fatigueData.recommendations.length > 0 && (
            <div className="mt-6 bg-card-bg/40 border border-border-subtle rounded-lg p-4">
              <h3 className="text-lg font-bold mb-3 text-orange-100">{t('insights.recommended_actions')}</h3>
              <div className="space-y-2">
                {fatigueData.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <p className="text-sm text-gray-200">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Critical Refreshes List */}
      {fatigueData?.critical_refreshes && fatigueData.critical_refreshes.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-bold text-white">{t('insights.critical_refresh')}</h3>
            <span className="ml-auto text-sm text-gray-400">
              {fatigueData.critical_refreshes.length} {t('insights.ads')}
            </span>
          </div>
          <div className="space-y-3">
            {fatigueData.critical_refreshes.map((creative: any) => (
              <div key={creative.creative_id} className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-red-400">{t('insights.critical').toUpperCase()}</span>
                    </div>
                    <div className="text-sm font-semibold mb-2 truncate text-gray-200">
                      {creative.ad_name || creative.title || 'Untitled Ad'}
                    </div>
                    <div className="flex gap-6 text-xs text-gray-400">
                      <div>{t('insights.initial_ctr')}: <span className="text-gray-200 font-semibold">{creative.initial_ctr.toFixed(2)}%</span></div>
                      <div>{t('insights.recent_ctr')}: <span className="text-gray-200 font-semibold">{creative.recent_ctr.toFixed(2)}%</span></div>
                      <div>{t('insights.decline')}: <span className="text-red-400 font-bold">{creative.fatigue_pct.toFixed(1)}%</span></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning Refreshes List */}
      {fatigueData?.warning_refreshes && fatigueData.warning_refreshes.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-bold text-white">{t('insights.warning_refresh')}</h3>
            <span className="ml-auto text-sm text-gray-400">
              {fatigueData.warning_refreshes.length} {t('insights.ads')}
            </span>
          </div>
          <div className="space-y-3">
            {fatigueData.warning_refreshes.map((creative: any) => (
              <div key={creative.creative_id} className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-orange-400">{t('insights.warning').toUpperCase()}</span>
                    </div>
                    <div className="text-sm font-semibold mb-2 truncate text-gray-200">
                      {creative.ad_name || creative.title || 'Untitled Ad'}
                    </div>
                    <div className="flex gap-6 text-xs text-gray-400">
                      <div>{t('insights.initial_ctr')}: <span className="text-gray-200 font-semibold">{creative.initial_ctr.toFixed(2)}%</span></div>
                      <div>{t('insights.recent_ctr')}: <span className="text-gray-200 font-semibold">{creative.recent_ctr.toFixed(2)}%</span></div>
                      <div>{t('insights.decline')}: <span className="text-orange-400 font-bold">{creative.fatigue_pct.toFixed(1)}%</span></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      {analysisData.metadata && (
        <div className="text-center text-xs text-gray-500">
          ✨ {t('insights.analyzed_period', { start: startDate, end: endDate })} • {t('insights.generated_at')}{' '}
          {new Date(analysisData.metadata.generated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
