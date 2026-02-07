"use client";

/**
 * CreativeComparisonModal Component
 * Displays side-by-side comparison of 2-5 creatives with winner highlights
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, Crown, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchCreativeComparison } from '../../services/creatives.service';
import { DateRange } from '../../types/dashboard.types';
import { CreativeMetrics, CreativeComparisonResponse } from '../../types/creatives.types';

interface CreativeComparisonModalProps {
  creativeIds: number[];
  creatives: CreativeMetrics[];  // To get names/titles
  dateRange: DateRange;
  accountId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CreativeComparisonModal: React.FC<CreativeComparisonModalProps> = ({
  creativeIds,
  creatives,
  dateRange,
  accountId,
  isOpen,
  onClose,
}) => {
  const [comparisonData, setComparisonData] = useState<CreativeComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && creativeIds.length >= 2) {
      loadComparisonData();
    }
  }, [isOpen, creativeIds, dateRange, accountId]);

  const loadComparisonData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCreativeComparison(creativeIds, dateRange, accountId);
      setComparisonData(data);
    } catch (err: any) {
      console.error('[CreativeComparisonModal] Error loading comparison:', err);
      setError('Failed to load comparison data');
    } finally {
      setIsLoading(false);
    }
  };

  // Get creative name by ID
  const getCreativeName = (creativeId: number): string => {
    const creative = creatives.find(c => c.creative_id === creativeId);
    return creative?.title || `Creative ${creativeId}`;
  };

  // Format metric value
  const formatMetricValue = (metricName: string, value: number): string => {
    if (metricName.includes('rate') || metricName === 'ctr') {
      return `${value.toFixed(2)}%`;
    } else if (metricName === 'roas') {
      return `${value.toFixed(2)}x`;
    } else if (metricName.includes('spend') || metricName.includes('cpc') || metricName.includes('cpa')) {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else {
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
  };

  // Get metric display name
  const getMetricDisplayName = (metricName: string): string => {
    const names: Record<string, string> = {
      spend: 'Spend',
      roas: 'ROAS',
      ctr: 'CTR',
      cpc: 'CPC',
      conversions: 'Conversions',
      cpa: 'CPA',
      hook_rate: 'Hook Rate',
      completion_rate: 'Completion Rate',
    };
    return names[metricName] || metricName;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-6xl mx-auto card-gradient rounded-2xl border border-border-subtle shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <div>
            <h2 className="text-2xl font-bold text-white">Creative Comparison</h2>
            <p className="text-sm text-gray-400 mt-1">
              Comparing {creativeIds.length} creatives • <span className="text-gray-500">The winner for each metric is highlighted with a crown</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
              <p className="text-gray-400">Loading comparison data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-red-400 mb-2">{error}</p>
              <button
                onClick={loadComparisonData}
                className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-white transition-colors"
              >
                Retry
              </button>
            </div>
          ) : !comparisonData ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-gray-400">No comparison data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="px-4 py-4 text-left text-sm font-bold text-gray-400 uppercase tracking-wider">
                      Metric
                    </th>
                    {comparisonData.creative_ids.map((creativeId) => (
                      <th
                        key={creativeId}
                        className="px-4 py-4 text-center text-sm font-bold text-gray-400 uppercase tracking-wider"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-white font-bold text-base">
                            {getCreativeName(creativeId)}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            ID: {creativeId}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.03]">
                  {comparisonData.comparisons.map((comparison) => (
                    <tr key={comparison.metric_name} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-4 text-sm font-medium text-white">
                        {getMetricDisplayName(comparison.metric_name)}
                      </td>
                      {comparisonData.creative_ids.map((creativeId) => {
                        const value = comparison.values[creativeId];
                        const isWinner = comparison.winner_id === creativeId;

                        return (
                          <td
                            key={creativeId}
                            className={`px-4 py-4 text-center text-sm font-bold transition-colors ${
                              isWinner ? 'text-green-400' : 'text-white'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              {isWinner && (
                                <Crown className="w-4 h-4 text-yellow-400" />
                              )}
                              <span>{formatMetricValue(comparison.metric_name, value)}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreativeComparisonModal;
