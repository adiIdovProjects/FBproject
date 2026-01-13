"use client";

/**
 * CampaignsTable Component
 * Sortable table showing campaigns with metrics and period comparison
 */

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpDown, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { CampaignRow, SortConfig } from '../../types/campaigns.types';
import { useAccount } from '../../context/AccountContext';

interface CampaignsTableProps {
  campaigns: CampaignRow[];
  isLoading?: boolean;
  currency?: string;
  isRTL?: boolean;
  showComparison?: boolean;
  selectedCampaignIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
}

export const CampaignsTable: React.FC<CampaignsTableProps> = ({
  campaigns,
  isLoading = false,
  currency = 'USD',
  isRTL = false,
  showComparison = false,
  selectedCampaignIds,
  onSelectionChange,
}) => {
  const t = useTranslations();
  const { hasROAS } = useAccount();
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'spend',
    direction: 'desc',
  });

  // Checkbox handlers
  const handleCheckboxToggle = (campaignId: number) => {
    if (!onSelectionChange) return;
    const isSelected = selectedCampaignIds?.includes(campaignId) || false;
    const newSelection = isSelected
      ? (selectedCampaignIds || []).filter(id => id !== campaignId)
      : [...(selectedCampaignIds || []), campaignId];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if ((selectedCampaignIds || []).length === sortedCampaigns.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(sortedCampaigns.map(c => c.campaign_id));
    }
  };

  // Use account-level hasROAS from context (with fallback to local check)
  const hasConversionValue = hasROAS ?? campaigns.some(campaign => (campaign.conversion_value || 0) > 0);

  // Sort campaigns
  const sortedCampaigns = useMemo(() => {
    const sorted = [...campaigns];
    sorted.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle computed values for sorting if needed
      if (sortConfig.key === 'ctr' as any) {  // Type assertion if key isn't in CampaignRow yet (it is)
        // a.ctr is available
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
  }, [campaigns, sortConfig]);

  // Selection state
  const allSelected = sortedCampaigns.length > 0 &&
    (selectedCampaignIds || []).length === sortedCampaigns.length;
  const someSelected = (selectedCampaignIds || []).length > 0 &&
    (selectedCampaignIds || []).length < sortedCampaigns.length;

  // Handle column sort
  const handleSort = (key: keyof CampaignRow | 'conversion_rate') => { // Added conversion_rate alias if needed, but we can compute it
    setSortConfig((prev) => ({
      key: key as keyof CampaignRow,
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

  // Render status badge
  const renderStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      ACTIVE: 'bg-green-900/30 text-green-400 border-green-600',
      PAUSED: 'bg-yellow-900/30 text-yellow-400 border-yellow-600',
      ARCHIVED: 'bg-gray-700 text-gray-400 border-gray-600',
    };

    const colorClass = statusColors[status.toUpperCase()] || statusColors.ARCHIVED;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-md border ${colorClass}`}>
        {status}
      </span>
    );
  };

  // Render trend badge
  const renderTrendBadge = (changePercent?: number, metricType: 'cost' | 'performance' = 'performance') => {
    if (changePercent === undefined || changePercent === null || isNaN(changePercent)) {
      return <span className="text-gray-500 text-sm">-</span>;
    }

    const isPositive = changePercent > 0;
    const isNegative = changePercent < 0;

    // For cost metrics (CPA, Spend, CPC), down is good
    // For performance metrics (ROAS, Conversions, CTR, Conv Rate), up is good
    let isGood = false;

    if (metricType === 'cost') {
      isGood = isNegative;
    } else {
      isGood = isPositive;
    }

    const colorClass = isGood ? 'text-green-400' : 'text-red-400';
    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <div className={`inline-flex items-center gap-1 text-xs font-medium ${colorClass}`}>
        <Icon className="w-3 h-3" />
        <span>{Math.abs(changePercent).toFixed(1)}%</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="card-gradient p-12 rounded-2xl border border-border-subtle flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">{t('campaigns.loading_campaigns')}</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="card-gradient p-12 rounded-2xl border border-border-subtle flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <p className="text-lg font-bold">{t('campaigns.no_data')}</p>
        <p className="text-sm">{t('common.no_data_available')}</p>
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
              {onSelectionChange && (
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
              )}

              {/* Campaign Name */}
              <th
                className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('campaign_name')}
              >
                <div className="flex items-center gap-2">
                  <span>{t('campaigns.campaign_name')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>

              <th
                className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('campaign_status')}
              >
                <div className="flex items-center gap-2">
                  <span>{t('common.status')}</span>
                </div>
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
                  VS PREV
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
                  VS PREV
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
                  VS PREV
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
                  VS PREV
                </th>
              )}

              {/* Conversion Rate */}
              <th
                className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
              // On-the-fly computed
              >
                <div className="flex items-center justify-end gap-2">
                  <span>{t('metrics.conversion_rate')}</span>
                </div>
              </th>
              {showComparison && (
                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  VS PREV
                </th>
              )}

              {/* ROAS - Conditional */}
              {hasConversionValue && (
                <>
                  <th
                    className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                    onClick={() => handleSort('roas')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>{t('metrics.roas')}</span>
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    </div>
                  </th>
                  {showComparison && (
                    <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      VS PREV
                    </th>
                  )}
                </>
              )}

            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.03]">
            {sortedCampaigns.map((campaign) => {
              const isSelected = (selectedCampaignIds || []).includes(campaign.campaign_id);

              // Calculate Conv Rate Change
              let convRateChange = undefined;
              if (showComparison && campaign.previous_clicks && campaign.previous_conversions !== undefined) {
                const currentRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) : 0;
                const prevRate = campaign.previous_clicks > 0 ? (campaign.previous_conversions / campaign.previous_clicks) : 0;

                if (prevRate > 0) {
                  convRateChange = ((currentRate - prevRate) / prevRate) * 100;
                }
              }

              return (
                <tr
                  key={campaign.campaign_id}
                  className={`group hover:bg-white/[0.02] transition-colors duration-150 ${isSelected ? 'bg-accent/5' : ''}`}
                >
                  {/* Checkbox */}
                  {onSelectionChange && (
                    <td className="px-4 py-5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleCheckboxToggle(campaign.campaign_id)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-accent focus:ring-accent focus:ring-offset-gray-900 cursor-pointer"
                      />
                    </td>
                  )}

                  {/* Name */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm text-white font-bold group-hover:text-accent transition-colors">{campaign.campaign_name}</span>
                      <span className="text-[10px] text-gray-500 font-mono mt-0.5">{campaign.campaign_id}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-5">
                    {renderStatusBadge(campaign.campaign_status)}
                  </td>

                  {/* Spend */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatCurrency(campaign.spend)}
                  </td>
                  {showComparison && (
                    <td className="px-6 py-5 text-right">
                      {renderTrendBadge(campaign.spend_change_pct, 'cost')}
                    </td>
                  )}

                  {/* CTR */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatPercentage(campaign.ctr)}
                  </td>
                  {showComparison && (
                    <td className="px-6 py-5 text-right">
                      {renderTrendBadge(campaign.ctr_change_pct, 'performance')}
                    </td>
                  )}

                  {/* CPC */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatCurrencyDecimal(campaign.cpc)}
                  </td>
                  {showComparison && (
                    <td className="px-6 py-5 text-right">
                      {renderTrendBadge(campaign.cpc_change_pct, 'cost')}
                    </td>
                  )}

                  {/* Conversions */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatNumber(campaign.conversions)}
                  </td>
                  {showComparison && (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {renderTrendBadge(campaign.conversions_change_pct, 'performance')}
                    </td>
                  )}

                  {/* CPA */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {formatCurrencyDecimal(campaign.cpa)}
                  </td>
                  {showComparison && (
                    <td className="px-6 py-5 text-right">
                      {renderTrendBadge(campaign.cpa_change_pct, 'cost')}
                    </td>
                  )}

                  {/* Conv Rate (Conversions / Clicks) */}
                  <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                    {campaign.clicks > 0 ? formatPercentage((campaign.conversions / campaign.clicks) * 100) : '0.00%'}
                  </td>
                  {showComparison && (
                    <td className="px-6 py-5 text-right">
                      {renderTrendBadge(convRateChange, 'performance')}
                    </td>
                  )}

                  {/* ROAS */}
                  {hasConversionValue && (
                    <>
                      <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                        {campaign.roas !== null && campaign.roas !== undefined && campaign.roas > 0 ? (
                          <>
                            <span className="text-gray-400 text-[10px] mr-1">x</span>
                            {campaign.roas.toFixed(2)}
                          </>
                        ) : (
                          <span className="text-gray-500 italic text-[10px]">N/A</span>
                        )}
                      </td>

                      {showComparison && (
                        <td className="px-6 py-5 text-right">
                          {campaign.roas !== null && campaign.roas !== undefined && campaign.roas > 0 &&
                            renderTrendBadge(campaign.roas_change_pct, 'performance')}
                        </td>
                      )}
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div >
  );
};

export default CampaignsTable;
