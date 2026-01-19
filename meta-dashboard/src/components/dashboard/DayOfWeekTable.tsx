"use client";

/**
 * DayOfWeekTable Component
 * Displays performance metrics broken down by day of week
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DayOfWeekBreakdown } from '../../types/dashboard.types';
import { InfoTooltip } from '../ui/InfoTooltip';

interface DayOfWeekTableProps {
  data: DayOfWeekBreakdown[];
  isLoading: boolean;
  currency?: string;
  isRTL?: boolean;
  hasROAS?: boolean;
}

export const DayOfWeekTable: React.FC<DayOfWeekTableProps> = ({
  data,
  isLoading,
  currency = 'USD',
  isRTL = false,
  hasROAS = false,
}) => {
  const t = useTranslations();

  // Format currency
  const formatCurrency = (value: number, decimals: number = 2): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
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

  // Check if any row has ROAS data
  const hasAnyROAS = hasROAS && data.some(row => row.roas !== null && row.roas > 0);

  return (
    <div className="card-gradient rounded-2xl border border-border-subtle overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-black/20 border-b border-border-subtle px-6 py-4">
        <h3 className="text-white font-bold text-lg">
          {t('dashboard.day_of_week_performance')}
        </h3>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        )}

        {!isLoading && data.length === 0 && (
          <div className="flex items-center justify-center h-48 text-gray-400">
            {t('common.no_data_available')}
          </div>
        )}

        {!isLoading && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750 border-b border-gray-700">
                <tr>
                  <th className={`px-4 py-3 text-xs font-medium text-gray-400 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('dashboard.day')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    <div className="flex items-center justify-end gap-1.5">
                      <InfoTooltip tooltipKey="metrics.spend_tooltip" size="sm" />
                      <span>{t('metrics.spend')}</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    <div className="flex items-center justify-end gap-1.5">
                      <InfoTooltip tooltipKey="metrics.impressions_tooltip" size="sm" />
                      <span>{t('metrics.impressions')}</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    <div className="flex items-center justify-end gap-1.5">
                      <InfoTooltip tooltipKey="metrics.clicks_tooltip" size="sm" />
                      <span>{t('metrics.clicks')}</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    <div className="flex items-center justify-end gap-1.5">
                      <InfoTooltip tooltipKey="metrics.ctr_tooltip" size="sm" />
                      <span>{t('metrics.ctr')}</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    <div className="flex items-center justify-end gap-1.5">
                      <InfoTooltip tooltipKey="metrics.cpc_tooltip" size="sm" />
                      <span>{t('metrics.cpc')}</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    <div className="flex items-center justify-end gap-1.5">
                      <InfoTooltip tooltipKey="metrics.conversions_tooltip" size="sm" />
                      <span>{t('metrics.conversions')}</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    <div className="flex items-center justify-end gap-1.5">
                      <InfoTooltip tooltipKey="metrics.cpa_tooltip" size="sm" />
                      <span>{t('metrics.cpa')}</span>
                    </div>
                  </th>
                  {hasAnyROAS && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                      <div className="flex items-center justify-end gap-1.5">
                        <InfoTooltip tooltipKey="metrics.roas_tooltip" size="sm" />
                        <span>{t('metrics.roas')}</span>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-700">
                {data.map((row, index) => (
                  <tr
                    key={row.day_of_week}
                    className="hover:bg-gray-750 transition-colors duration-150"
                  >
                    {/* Day */}
                    <td className={`px-4 py-4 text-sm text-gray-200 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t(`days.${row.day_of_week.toLowerCase()}`)}
                    </td>

                    {/* Spend */}
                    <td className="px-4 py-4 text-sm text-gray-200 text-right font-mono">
                      {formatCurrency(row.spend, 0)}
                    </td>

                    {/* Impressions */}
                    <td className="px-4 py-4 text-sm text-gray-200 text-right font-mono">
                      {formatNumber(row.impressions)}
                    </td>

                    {/* Clicks */}
                    <td className="px-4 py-4 text-sm text-gray-200 text-right font-mono">
                      {formatNumber(row.clicks)}
                    </td>

                    {/* CTR */}
                    <td className="px-4 py-4 text-sm text-gray-200 text-right font-mono">
                      {formatPercentage(row.ctr)}
                    </td>

                    {/* CPC */}
                    <td className="px-4 py-4 text-sm text-gray-200 text-right font-mono">
                      {formatCurrency(row.cpc, 1)}
                    </td>

                    {/* Conversions */}
                    <td className="px-4 py-4 text-sm text-gray-200 text-right font-mono">
                      {formatNumber(row.conversions)}
                    </td>

                    {/* CPA */}
                    <td className="px-4 py-4 text-sm text-gray-200 text-right font-mono">
                      {formatCurrency(row.cpa, 1)}
                    </td>

                    {/* ROAS */}
                    {hasAnyROAS && (
                      <td className="px-4 py-4 text-sm text-gray-200 text-right font-mono">
                        {row.roas !== null ? row.roas.toFixed(2) : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayOfWeekTable;
