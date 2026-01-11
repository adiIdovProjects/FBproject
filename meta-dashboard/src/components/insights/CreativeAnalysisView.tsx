"use client";

/**
 * Creative Analysis View Component
 * Displays creative theme performance, CTA effectiveness, and winning patterns
 */

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Palette, Target, TrendingUp, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  fetchCreativeAnalysis,
  CreativeAnalysisResponse
} from '../../services/insights.service';

interface CreativeAnalysisViewProps {
  startDate: string;
  endDate: string;
  isRTL: boolean;
}

export default function CreativeAnalysisView({
  startDate,
  endDate,
  isRTL
}: CreativeAnalysisViewProps) {
  const locale = useLocale();
  const [data, setData] = useState<CreativeAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchCreativeAnalysis({ startDate, endDate }, undefined, locale);
        setData(result);
      } catch (err: any) {
        console.error('[Creative Analysis] Error:', err);
        setError(err.message || 'Failed to load creative analysis');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

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
          <p className="font-bold">Error Loading Creative Analysis</p>
        </div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="text-center py-12">
        <Palette className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No creative data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Analysis Card */}
      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-xl p-6 shadow-lg">
        <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <Palette className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-purple-200">Creative Performance Analysis</h2>
        </div>
        <div className={`prose prose-invert max-w-none ${isRTL ? 'text-right' : 'text-left'}`}>
          <ReactMarkdown>{data.analysis}</ReactMarkdown>
        </div>
      </div>

      {/* Summary Stats */}
      {data.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card-bg/60 border border-border-subtle rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Total Creatives Analyzed</div>
            <div className="text-2xl font-bold">{data.data.total_creatives || 0}</div>
          </div>

          <div className="bg-card-bg/60 border border-border-subtle rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Themes Detected</div>
            <div className="text-2xl font-bold">
              {Object.keys(data.data.theme_performance || {}).length}
            </div>
          </div>

          <div className="bg-card-bg/60 border border-border-subtle rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Fatigued Creatives</div>
            <div className="text-2xl font-bold text-red-400">
              {data.data.fatigued_creatives_count || 0}
            </div>
          </div>
        </div>
      )}

      {/* Theme Performance */}
      {data.data && data.data.theme_performance && Object.keys(data.data.theme_performance).length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold">Theme Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Theme</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Creatives</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Spend</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Conversions</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">ROAS</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">CTR</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.data.theme_performance)
                  .sort(([, a], [, b]) => b.overall_roas - a.overall_roas)
                  .map(([theme, stats]) => (
                    <tr key={theme} className="border-b border-border-subtle/50 hover:bg-card-bg/60">
                      <td className="py-3 px-4 text-sm font-medium capitalize">
                        {theme.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {stats.creative_count}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        ${stats.total_spend.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {stats.total_conversions}
                      </td>
                      <td className={`py-3 px-4 text-sm text-right font-semibold ${stats.overall_roas >= 2 ? 'text-green-400' : stats.overall_roas >= 1 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                        {stats.overall_roas.toFixed(2)}x
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {stats.avg_ctr.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CTA Performance */}
      {data.data && data.data.cta_performance && data.data.cta_performance.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold">CTA Effectiveness</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">CTA Type</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Creatives</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">CTR</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">ROAS</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.cta_performance.map((cta) => (
                  <tr key={cta.cta_type} className="border-b border-border-subtle/50 hover:bg-card-bg/60">
                    <td className="py-3 px-4 text-sm font-medium">
                      {cta.cta_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      {cta.creative_count}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      {cta.avg_ctr.toFixed(2)}%
                    </td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${cta.avg_roas >= 2 ? 'text-green-400' : cta.avg_roas >= 1 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                      {cta.avg_roas.toFixed(2)}x
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      {cta.total_conversions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Performers */}
      {data.data && data.data.top_performers && data.data.top_performers.length > 0 && (
        <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Top Performing Creatives</h3>
          <div className="space-y-3">
            {data.data.top_performers.map((creative) => (
              <div
                key={creative.creative_id}
                className="bg-card-bg/60 border border-border-subtle rounded-lg p-4 hover:bg-card-bg/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold mb-1 truncate">
                      {creative.title || `Creative #${creative.creative_id}`}
                    </div>
                    <div className="text-xs text-gray-400 line-clamp-2 mb-2">
                      {creative.body}
                    </div>
                  </div>
                  <div className="flex gap-4 text-right flex-shrink-0">
                    <div>
                      <div className="text-xs text-gray-400">ROAS</div>
                      <div className="text-sm font-bold text-green-400">
                        {creative.roas.toFixed(2)}x
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">CTR</div>
                      <div className="text-sm font-bold">
                        {creative.ctr.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Conv</div>
                      <div className="text-sm font-bold">
                        {creative.conversions}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      {data.metadata && (
        <div className="text-center text-xs text-gray-500">
          ✨ Analyzed {startDate} to {endDate} • Generated at{' '}
          {new Date(data.metadata.generated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
