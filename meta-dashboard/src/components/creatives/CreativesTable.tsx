"use client";

/**
 * CreativesTable Component
 * Sortable table showing creatives with metrics
 */

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpDown, Loader2, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { CreativeMetrics } from '../../types/creatives.types';
import { DateRange } from '../../types/dashboard.types';
import FatigueBadge from './FatigueBadge';
import CTRTrendChart from './CTRTrendChart';
import { useAccount } from '../../context/AccountContext';

type SortKey = keyof CreativeMetrics | 'ctr' | 'cpc' | 'cpa' | 'roas';

interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

interface CreativesTableProps {
  creatives: CreativeMetrics[];
  isLoading?: boolean;
  currency?: string;
  isRTL?: boolean;
  dateRange?: DateRange;
  accountId?: string | null;
  selectedCreativeIds?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  showComparison?: boolean;
}

export const CreativesTable: React.FC<CreativesTableProps> = ({
  creatives,
  isLoading = false,
  currency = 'USD',
  isRTL = false,
  dateRange,
  accountId,
  selectedCreativeIds = [],
  onSelectionChange,
  showComparison = false,
}) => {
  const t = useTranslations();
  const { hasROAS } = useAccount();
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'spend',
    direction: 'desc',
  });
  const [selectedCreative, setSelectedCreative] = useState<{ id: number; name: string } | null>(null);
  const [showCTRTrendModal, setShowCTRTrendModal] = useState(false);

  // Use account-level hasROAS from context (with fallback to local check)
  const hasConversionValue = hasROAS ?? creatives.some(creative => (creative.conversion_value || 0) > 0);

  // Sort creatives
  const sortedCreatives = useMemo(() => {
    const sorted = [...creatives];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Handle computed metrics
      if (sortConfig.key === 'ctr') {
        aValue = a.ctr;
        bValue = b.ctr;
      } else if (sortConfig.key === 'cpc') {
        aValue = a.clicks > 0 ? a.spend / a.clicks : 0;
        bValue = b.clicks > 0 ? b.spend / b.clicks : 0;
      } else if (sortConfig.key === 'cpa') {
        aValue = a.cpa;
        bValue = b.cpa;
      } else if (sortConfig.key === 'roas') {
        aValue = a.roas || 0;
        bValue = b.roas || 0;
      } else {
        aValue = a[sortConfig.key as keyof CreativeMetrics];
        bValue = b[sortConfig.key as keyof CreativeMetrics];
      }

      if (aValue === undefined || bValue === undefined) return 0;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return sorted;
  }, [creatives, sortConfig]);

  // Handle column sort
  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format currency with 1 decimal (CPC, CPA)
  const formatCurrencyDecimal = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  };

  // Format number
  const formatNumber = (value: number): string => {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  // Render trend badge for comparison with tooltip
  const renderTrendBadge = (
    changePercent?: number | null,
    metricType: 'cost' | 'performance' | 'neutral' = 'performance',
    previousValue?: number | null,
    formatFn?: (value: number) => string
  ) => {
    if (changePercent === undefined || changePercent === null || isNaN(changePercent)) {
      return <span className="text-gray-500 text-sm">-</span>;
    }

    const isPositive = changePercent > 0;
    const isNegative = changePercent < 0;

    // Determine color based on metric type
    let colorClass = 'text-gray-400'; // neutral default
    if (metricType === 'cost') {
      // For cost metrics (CPA, CPC), down is good
      colorClass = isNegative ? 'text-green-400' : 'text-red-400';
    } else if (metricType === 'performance') {
      // For performance metrics (Conversions, CTR), up is good
      colorClass = isPositive ? 'text-green-400' : 'text-red-400';
    }
    // 'neutral' keeps gray color - no judgment on good/bad

    const Icon = isPositive ? TrendingUp : TrendingDown;

    // Build tooltip text
    const tooltipText = previousValue !== undefined && previousValue !== null && formatFn
      ? `Previous: ${formatFn(previousValue)}`
      : undefined;

    return (
      <div
        className={`inline-flex items-center gap-1 text-xs font-medium ${colorClass} cursor-help`}
        title={tooltipText}
      >
        <Icon className="w-3 h-3" />
        <span>{Math.abs(changePercent).toFixed(1)}%</span>
      </div>
    );
  };

  // Handle checkbox toggle
  const handleCheckboxToggle = (creativeId: number) => {
    if (!onSelectionChange) return;

    const isSelected = selectedCreativeIds.includes(creativeId);
    const newSelection = isSelected
      ? selectedCreativeIds.filter(id => id !== creativeId)
      : [...selectedCreativeIds, creativeId];

    onSelectionChange(newSelection);
  };

  // Handle select all toggle
  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedCreativeIds.length === sortedCreatives.length) {
      // Deselect all
      onSelectionChange([]);
    } else {
      // Select all
      onSelectionChange(sortedCreatives.map(c => c.creative_id));
    }
  };

  const allSelected = sortedCreatives.length > 0 && selectedCreativeIds.length === sortedCreatives.length;
  const someSelected = selectedCreativeIds.length > 0 && selectedCreativeIds.length < sortedCreatives.length;

  // Render type badge
  const renderTypeBadge = (creative: CreativeMetrics) => {
    if (creative.is_video) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-md border bg-purple-900/30 text-purple-400 border-purple-600">
          {t('creatives.types.video')}
        </span>
      );
    }
    if (creative.is_carousel) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-md border bg-orange-900/30 text-orange-400 border-orange-600">
          {t('creatives.types.carousel')}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-md border bg-blue-900/30 text-blue-400 border-blue-600">
        {t('creatives.types.image')}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="card-gradient p-12 rounded-2xl border border-border-subtle flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Loading creatives...</p>
      </div>
    );
  }

  if (creatives.length === 0) {
    return (
      <div className="card-gradient p-12 rounded-2xl border border-border-subtle flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <p className="text-lg font-bold">No creatives found</p>
        <p className="text-sm">Try adjusting your search or date range</p>
      </div>
    );
  }

  return (
    <div className="card-gradient rounded-2xl border border-border-subtle overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black/20 border-b border-border-subtle">
              {/* Checkbox Column */}
              <th className="px-4 py-5 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected;
                    }
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-accent focus:ring-accent focus:ring-offset-gray-900 cursor-pointer"
                />
              </th>

              {/* Thumbnail */}
              <th className={`px-4 py-5 ${isRTL ? 'text-right' : 'text-left'} text-[10px] font-black text-gray-500 uppercase tracking-widest`}>
                <span>{t('creatives.preview')}</span>
              </th>

              {/* Creative Name */}
              <th
                className={`px-6 py-5 ${isRTL ? 'text-right' : 'text-left'} text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors`}
                onClick={() => handleSort('title')}
              >
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t('creatives.creative')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>

              {/* Type */}
              <th className={`px-6 py-5 ${isRTL ? 'text-right' : 'text-left'} text-[10px] font-black text-gray-500 uppercase tracking-widest`}>
                <span>{t('creatives.type')}</span>
              </th>

              {/* Fatigue */}
              <th className={`px-6 py-5 ${isRTL ? 'text-right' : 'text-left'} text-[10px] font-black text-gray-500 uppercase tracking-widest`}>
                <span>{t('creatives.fatigue')}</span>
              </th>

              {/* Spend */}
              <th
                className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('spend')}
              >
                <div className="flex items-center justify-end gap-2">
                  <span>{t('metrics.spend')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>
              {showComparison && (
                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  {t('common.vs_previous')}
                </th>
              )}

              {/* CTR */}
              <th
                className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('ctr')}
              >
                <div className="flex items-center justify-end gap-2">
                  <span>{t('metrics.ctr')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>
              {showComparison && (
                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  {t('common.vs_previous')}
                </th>
              )}

              {/* CPC */}
              <th
                className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('cpc')}
              >
                <div className="flex items-center justify-end gap-2">
                  <span>{t('metrics.cpc')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>
              {showComparison && (
                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  {t('common.vs_previous')}
                </th>
              )}

              {/* Conversions */}
              <th
                className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('conversions')}
              >
                <div className="flex items-center justify-end gap-2">
                  <span>{t('metrics.conversions')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>
              {showComparison && (
                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  {t('common.vs_previous')}
                </th>
              )}

              {/* CPA */}
              <th
                className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('cpa')}
              >
                <div className="flex items-center justify-end gap-2">
                  <span>{t('metrics.cpa')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>
              {showComparison && (
                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  {t('common.vs_previous')}
                </th>
              )}

              {/* ROAS - Conditional */}
              {hasConversionValue && (
                <th
                  className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                  onClick={() => handleSort('roas')}
                >
                  <div className="flex items-center justify-end gap-2">
                    <span>{t('metrics.roas')}</span>
                    <ArrowUpDown className="w-3 h-3 opacity-50" />
                  </div>
                </th>
              )}

              {/* Hook Rate (video only - show for all but display N/A for images) */}
              <th
                className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('hook_rate')}
              >
                <div className="flex items-center justify-end gap-2">
                  <span>Hook Rate</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>

              {/* Completion Rate (video only) */}
              <th
                className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('completion_rate')}
              >
                <div className="flex items-center justify-end gap-2">
                  <span>Completion</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.03]">
            {sortedCreatives.map((creative) => {
              const cpc = creative.clicks > 0 ? creative.spend / creative.clicks : 0;
              const isSelected = selectedCreativeIds.includes(creative.creative_id);

              return (
                <tr
                  key={creative.creative_id}
                  className={`group hover:bg-white/[0.02] transition-colors duration-150 ${isSelected ? 'bg-accent/5' : ''}`}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCheckboxToggle(creative.creative_id)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-accent focus:ring-accent focus:ring-offset-gray-900 cursor-pointer"
                    />
                  </td>

                  {/* Thumbnail */}
                  <td className="px-4 py-5">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800/50 border border-border-subtle flex items-center justify-center">
                      {creative.is_video && creative.video_url ? (
                        <video
                          src={creative.video_url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                      ) : creative.image_url ? (
                        <img
                          src={creative.image_url}
                          alt={creative.title || `Creative ${creative.creative_id}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-600 text-xs">No preview</div>
                      )}
                    </div>
                  </td>

                  {/* Name with External Link */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      {(creative.image_url || creative.video_url) ? (
                        <a
                          href={creative.video_url || creative.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-white font-bold group-hover:text-accent transition-colors flex items-center gap-2"
                        >
                          <span>{creative.title || `Creative ${creative.creative_id}`}</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-sm text-white font-bold">
                          {creative.title || `Creative ${creative.creative_id}`}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-500 font-mono mt-0.5">{creative.creative_id}</span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-6 py-5">
                    {renderTypeBadge(creative)}
                  </td>

                  {/* Fatigue */}
                  <td className="px-6 py-5">
                    <FatigueBadge
                      severity={creative.fatigue_severity}
                      ctrDeclinePct={creative.ctr_decline_pct}
                      daysActive={creative.days_active}
                    />
                  </td>

                  {/* Spend */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatCurrency(creative.spend)}
                  </td>
                  {showComparison && (
                    <td className="px-6 py-5 text-right">
                      {renderTrendBadge(creative.spend_change_pct, 'neutral', creative.previous_spend, formatCurrency)}
                    </td>
                  )}

                  {/* CTR */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    <button
                      onClick={() => {
                        setSelectedCreative({
                          id: creative.creative_id,
                          name: creative.title || `Creative ${creative.creative_id}`
                        });
                        setShowCTRTrendModal(true);
                      }}
                      className="inline-flex items-center gap-1 hover:text-accent transition-colors cursor-pointer group"
                    >
                      {formatPercentage(creative.ctr)}
                      <TrendingUp className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </td>
                  {showComparison && (
                    <td className="px-6 py-5 text-right">
                      {renderTrendBadge(creative.ctr_change_pct, 'performance', creative.previous_ctr, formatPercentage)}
                    </td>
                  )}

                  {/* CPC */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatCurrencyDecimal(cpc)}
                  </td>
                  {showComparison && (
                    <td className="px-6 py-5 text-right">
                      {renderTrendBadge(creative.cpc_change_pct, 'cost', creative.previous_cpc, formatCurrencyDecimal)}
                    </td>
                  )}

                  {/* Conversions */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatNumber(creative.conversions)}
                  </td>
                  {showComparison && (
                    <td className="px-6 py-5 text-right">
                      {renderTrendBadge(creative.conversions_change_pct, 'performance', creative.previous_conversions, formatNumber)}
                    </td>
                  )}

                  {/* CPA */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatCurrencyDecimal(creative.cpa)}
                  </td>
                  {showComparison && (
                    <td className="px-6 py-5 text-right">
                      {renderTrendBadge(creative.cpa_change_pct, 'cost', creative.previous_cpa, formatCurrencyDecimal)}
                    </td>
                  )}

                  {/* ROAS */}
                  {hasConversionValue && (
                    <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                      {creative.roas !== null && creative.roas !== undefined && creative.roas > 0 ? (
                        <>
                          <span className="text-gray-400 text-[10px] mr-1">x</span>
                          {creative.roas.toFixed(2)}
                        </>
                      ) : (
                        <span className="text-gray-500 italic text-[10px]">N/A</span>
                      )}
                    </td>
                  )}

                  {/* Hook Rate */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {creative.is_video && creative.hook_rate !== null ? (
                      formatPercentage(creative.hook_rate)
                    ) : (
                      <span className="text-gray-500 italic text-[10px]">N/A</span>
                    )}
                  </td>

                  {/* Completion Rate */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {creative.is_video && creative.completion_rate !== null ? (
                      formatPercentage(creative.completion_rate)
                    ) : (
                      <span className="text-gray-500 italic text-[10px]">N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CTR Trend Modal */}
      {selectedCreative && dateRange && (
        <CTRTrendChart
          creativeId={selectedCreative.id}
          creativeName={selectedCreative.name}
          dateRange={dateRange}
          accountId={accountId}
          isOpen={showCTRTrendModal}
          onClose={() => {
            setShowCTRTrendModal(false);
            setSelectedCreative(null);
          }}
        />
      )}
    </div>
  );
};

export default CreativesTable;
