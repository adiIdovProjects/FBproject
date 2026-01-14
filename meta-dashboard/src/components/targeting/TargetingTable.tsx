"use client";

/**
 * TargetingTable Component
 * Sortable table showing ad sets with targeting metrics
 */

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpDown, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { TargetingRow } from '../../types/targeting.types';
import { useAccount } from '../../context/AccountContext';

type SortKey = keyof TargetingRow;

interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

interface TargetingTableProps {
  targetingData: TargetingRow[];
  isLoading?: boolean;
  currency?: string;
  isRTL?: boolean;
  selectedAdsetIds?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  showComparison?: boolean;
}

export const TargetingTable: React.FC<TargetingTableProps> = ({
  targetingData,
  isLoading = false,
  currency = 'USD',
  isRTL = false,
  selectedAdsetIds = [],
  onSelectionChange,
  showComparison = false,
}) => {
  const t = useTranslations();
  const { hasROAS } = useAccount();
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'spend',
    direction: 'desc',
  });

  // Use account-level hasROAS from context (with fallback to local check)
  const hasConversionValue = hasROAS ?? targetingData.some(adset => (adset.conversion_value || 0) > 0);

  // Sort adsets
  const sortedAdsets = useMemo(() => {
    const sorted = [...targetingData];
    sorted.sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

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
  }, [targetingData, sortConfig]);

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

  // Render change badge for comparison
  const renderChangeBadge = (changePct: number | null | undefined, metricType: 'cost' | 'performance' | 'neutral', prevValue?: number | null, formatter?: (v: number) => string) => {
    if (changePct === null || changePct === undefined) return <span className="text-gray-500 text-sm">-</span>;
    const isPositive = changePct > 0;
    const isNegative = changePct < 0;
    let colorClass = 'text-gray-400'; // neutral
    if (metricType === 'cost') {
      colorClass = isNegative ? 'text-green-400' : 'text-red-400';
    } else if (metricType === 'performance') {
      colorClass = isPositive ? 'text-green-400' : 'text-red-400';
    }
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const tooltip = prevValue !== null && prevValue !== undefined && formatter
      ? `Previous: ${formatter(prevValue)}` : undefined;
    return (
      <div className={`inline-flex items-center gap-1 text-xs font-medium ${colorClass} cursor-help`} title={tooltip}>
        <Icon className="w-3 h-3" />
        <span>{Math.abs(changePct).toFixed(1)}%</span>
      </div>
    );
  };

  // Handle checkbox toggle
  const handleCheckboxToggle = (adsetId: number) => {
    if (!onSelectionChange) return;

    const isSelected = selectedAdsetIds.includes(adsetId);
    const newSelection = isSelected
      ? selectedAdsetIds.filter(id => id !== adsetId)
      : [...selectedAdsetIds, adsetId];

    onSelectionChange(newSelection);
  };

  // Handle select all toggle
  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedAdsetIds.length === sortedAdsets.length) {
      // Deselect all
      onSelectionChange([]);
    } else {
      // Select all
      onSelectionChange(sortedAdsets.map(a => a.adset_id));
    }
  };

  const allSelected = sortedAdsets.length > 0 && selectedAdsetIds.length === sortedAdsets.length;
  const someSelected = selectedAdsetIds.length > 0 && selectedAdsetIds.length < sortedAdsets.length;

  // Render targeting type badge
  const renderTargetingBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Broad': 'bg-blue-900/30 text-blue-400 border-blue-600',
      'Lookalike': 'bg-purple-900/30 text-purple-400 border-purple-600',
      'Interest': 'bg-green-900/30 text-green-400 border-green-600',
      'Custom Audience': 'bg-orange-900/30 text-orange-400 border-orange-600',
    };

    const colorClass = colors[type] || 'bg-gray-900/30 text-gray-400 border-gray-600';

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-md border ${colorClass}`}>
        {type}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="card-gradient p-12 rounded-2xl border border-border-subtle flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">{t('targeting.loading')}</p>
      </div>
    );
  }

  if (targetingData.length === 0) {
    return (
      <div className="card-gradient p-12 rounded-2xl border border-border-subtle flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <p className="text-lg font-bold">{t('targeting.no_data')}</p>
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

              {/* Ad Set Name */}
              <th
                className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('adset_name')}
              >
                <div className="flex items-center gap-2">
                  <span>{t('targeting.adset_name')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>

              {/* Targeting Type */}
              <th
                className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('targeting_type')}
              >
                <div className="flex items-center gap-2">
                  <span>{t('targeting.targeting_type')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>

              {/* Targeting Summary */}
              <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                <span>{t('targeting.targeting_summary')}</span>
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
              {showComparison && <th className="px-4 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('common.vs_previous')}</th>}

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
              {showComparison && <th className="px-4 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('common.vs_previous')}</th>}

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
              {showComparison && <th className="px-4 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('common.vs_previous')}</th>}

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
              {showComparison && <th className="px-4 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('common.vs_previous')}</th>}

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
              {showComparison && <th className="px-4 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('common.vs_previous')}</th>}

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
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.03]">
            {sortedAdsets.map((adset) => {
              const isSelected = selectedAdsetIds.includes(adset.adset_id);

              return (
                <tr
                  key={adset.adset_id}
                  className={`group hover:bg-white/[0.02] transition-colors duration-150 ${isSelected ? 'bg-accent/5' : ''}`}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCheckboxToggle(adset.adset_id)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-accent focus:ring-accent focus:ring-offset-gray-900 cursor-pointer"
                    />
                  </td>

                  {/* Ad Set Name */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm text-white font-bold">
                        {adset.adset_name || `Adset ${adset.adset_id}`}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono mt-0.5">{adset.adset_id}</span>
                    </div>
                  </td>

                  {/* Targeting Type */}
                  <td className="px-6 py-5">
                    {renderTargetingBadge(adset.targeting_type)}
                  </td>

                  {/* Targeting Summary */}
                  <td className="px-6 py-5">
                    <div className="max-w-xs">
                      <span
                        className="text-xs text-gray-400 truncate block"
                        title={adset.targeting_summary}
                      >
                        {adset.targeting_summary || 'No targeting info'}
                      </span>
                    </div>
                  </td>

                  {/* Spend */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatCurrency(adset.spend)}
                  </td>
                  {showComparison && (
                    <td className="px-4 py-5 text-right">
                      {renderChangeBadge(adset.spend_change_pct, 'neutral', adset.previous_spend, (v) => formatCurrency(v))}
                    </td>
                  )}

                  {/* CTR */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatPercentage(adset.ctr)}
                  </td>
                  {showComparison && (
                    <td className="px-4 py-5 text-right">
                      {renderChangeBadge(adset.ctr_change_pct, 'performance', adset.previous_ctr, (v) => formatPercentage(v))}
                    </td>
                  )}

                  {/* CPC */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatCurrencyDecimal(adset.cpc)}
                  </td>
                  {showComparison && (
                    <td className="px-4 py-5 text-right">
                      {renderChangeBadge(adset.cpc_change_pct, 'cost', adset.previous_cpc, (v) => formatCurrencyDecimal(v))}
                    </td>
                  )}

                  {/* Conversions */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatNumber(adset.conversions)}
                  </td>
                  {showComparison && (
                    <td className="px-4 py-5 text-right">
                      {renderChangeBadge(adset.conversions_change_pct, 'performance', adset.previous_conversions, (v) => formatNumber(v))}
                    </td>
                  )}

                  {/* CPA */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatCurrencyDecimal(adset.cpa)}
                  </td>
                  {showComparison && (
                    <td className="px-4 py-5 text-right">
                      {renderChangeBadge(adset.cpa_change_pct, 'cost', adset.previous_cpa, (v) => formatCurrencyDecimal(v))}
                    </td>
                  )}

                  {/* ROAS */}
                  {hasConversionValue && (
                    <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                      {adset.roas !== null && adset.roas !== undefined && adset.roas > 0 ? (
                        <>
                          <span className="text-gray-400 text-[10px] mr-1">x</span>
                          {adset.roas.toFixed(2)}
                        </>
                      ) : (
                        <span className="text-gray-500 italic text-[10px]">N/A</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TargetingTable;
