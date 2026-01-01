/**
 * CampaignsTable Component
 * Sortable table showing campaigns with metrics and period comparison
 */

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpDown, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { CampaignRow, SortConfig } from '../../types/campaigns.types';

interface CampaignsTableProps {
  campaigns: CampaignRow[];
  isLoading?: boolean;
  currency?: string;
  isRTL?: boolean;
}

export const CampaignsTable: React.FC<CampaignsTableProps> = ({
  campaigns,
  isLoading = false,
  currency = 'USD',
  isRTL = false,
}) => {
  const t = useTranslations();
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'spend',
    direction: 'desc',
  });

  // Check if any campaign has conversion value
  const hasConversionValue = useMemo(() => {
    return campaigns.some(campaign => (campaign.conversion_value || 0) > 0);
  }, [campaigns]);

  // Sort campaigns
  const sortedCampaigns = useMemo(() => {
    const sorted = [...campaigns];
    sorted.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

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

  // Handle column sort
  const handleSort = (key: keyof CampaignRow) => {
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
    if (changePercent === undefined || changePercent === null) {
      return <span className="text-gray-500 text-sm">-</span>;
    }

    const isPositive = changePercent > 0;
    const isNegative = changePercent < 0;

    // For cost metrics (CPA, Spend), down is good
    // For performance metrics (ROAS, Conversions), up is good
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
        <p className="text-gray-500 font-medium animate-pulse">{t('loading_campaigns')}</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="card-gradient p-12 rounded-2xl border border-border-subtle flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <p className="text-lg font-bold">{t('no_campaigns_found')}</p>
        <p className="text-sm">Try adjusting your filters or date range</p>
      </div>
    );
  }

  return (
    <div className="card-gradient rounded-2xl border border-border-subtle overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black/20 border-b border-border-subtle">
              {/* Campaign Name */}
              <th
                className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('campaign_name')}
              >
                <div className="flex items-center gap-2">
                  <span>{t('extracted_campaign')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>

              <th
                className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('campaign_status')}
              >
                <div className="flex items-center gap-2">
                  <span>{t('extracted_status')}</span>
                </div>
              </th>

              <th
                className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('spend')}
              >
                <div className="flex items-center justify-end gap-2">
                  <span>{t('extracted_spend')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>

              <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                VS PREV
              </th>

              {hasConversionValue && (
                <>
                  <th
                    className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                    onClick={() => handleSort('roas')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>{t('extracted_roas')}</span>
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    </div>
                  </th>

                  <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    VS PREV
                  </th>
                </>
              )}

              <th
                className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('conversions')}
              >
                <div className="flex items-center justify-end gap-2">
                  <span>{t('extracted_conversions')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>

              <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                {t('leads') || 'Leads'}
              </th>

              <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                VS PREV
              </th>

              <th
                className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-accent transition-colors"
                onClick={() => handleSort('cpa')}
              >
                <div className="flex items-center justify-end gap-2">
                  <span>{t('extracted_cpa')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.03]">
            {sortedCampaigns.map((campaign) => (
              <tr
                key={campaign.campaign_id}
                className="group hover:bg-white/[0.02] transition-colors duration-150"
              >
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm text-white font-bold group-hover:text-accent transition-colors">{campaign.campaign_name}</span>
                    <span className="text-[10px] text-gray-500 font-mono mt-0.5">{campaign.campaign_id}</span>
                  </div>
                </td>

                <td className="px-6 py-5">
                  {renderStatusBadge(campaign.campaign_status)}
                </td>

                <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                  {formatCurrency(campaign.spend)}
                </td>

                <td className="px-6 py-5 text-right">
                  {renderTrendBadge(campaign.spend_change_pct, 'cost')}
                </td>

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

                    <td className="px-6 py-5 text-right">
                      {campaign.roas !== null && campaign.roas !== undefined && campaign.roas > 0 &&
                        renderTrendBadge(campaign.roas_change_pct, 'performance')}
                    </td>
                  </>
                )}

                <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                  {formatNumber(campaign.conversions)}
                </td>

                <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                  {formatNumber((campaign.lead_website || 0) + (campaign.lead_form || 0))}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {renderTrendBadge(campaign.conversions_change_pct, 'performance')}
                </td>

                <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                  {formatCurrency(campaign.cpa)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div >
  );
};

export default CampaignsTable;
