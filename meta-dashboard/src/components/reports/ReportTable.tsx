"use client";

/**
 * ReportTable Component
 * Displays report results in a data table
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { ComparisonItem } from '../../services/reports.service';
import { BreakdownRow } from '../../types/campaigns.types';

interface ReportTableProps {
  data: ComparisonItem[] | BreakdownRow[];
  isLoading: boolean;
  error: string | null;
  currency: string;
  isBreakdownData?: boolean; // true if data is BreakdownRow[], false if ComparisonItem[]
  isRTL?: boolean;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  data,
  isLoading,
  error,
  currency,
  isBreakdownData = false,
  isRTL = false,
}) => {
  const t = useTranslations();

  // Format helpers
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyDecimal = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const formatRoas = (value: number | null): string => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(2);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        {error}
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        {t('reports.no_data')}
      </div>
    );
  }

  // Render table based on data type
  if (isBreakdownData) {
    // BreakdownRow data (placement, demographics, country)
    const breakdownData = data as BreakdownRow[];
    const hasConversionValue = breakdownData.some(row => (row.conversion_value || 0) > 0);

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black/20 border-b border-border-subtle">
              <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase">{t('common.name')}</th>
              <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.spend')}</th>
              <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.impressions')}</th>
              <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.clicks')}</th>
              <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.ctr')}</th>
              <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.cpc')}</th>
              <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.conversions')}</th>
              <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.cpa')}</th>
              {hasConversionValue && (
                <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.roas')}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {breakdownData.map((row, idx) => (
              <tr key={idx} className="hover:bg-white/[0.02]">
                <td className="px-4 py-4 text-white font-medium">{row.name}</td>
                <td className="px-4 py-4 text-right text-white font-bold">{formatCurrency(row.spend)}</td>
                <td className="px-4 py-4 text-right text-gray-300">{formatNumber(row.impressions)}</td>
                <td className="px-4 py-4 text-right text-gray-300">{formatNumber(row.clicks)}</td>
                <td className="px-4 py-4 text-right text-gray-300">{formatPercent(row.ctr)}</td>
                <td className="px-4 py-4 text-right text-gray-300">{formatCurrencyDecimal(row.cpc)}</td>
                <td className="px-4 py-4 text-right text-gray-300">{formatNumber(row.conversions)}</td>
                <td className="px-4 py-4 text-right text-gray-300">{formatCurrencyDecimal(row.cpa)}</td>
                {hasConversionValue && (
                  <td className="px-4 py-4 text-right text-gray-300">{formatRoas(row.roas)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ComparisonItem data (from /reports/compare)
  const comparisonData = data as ComparisonItem[];
  const hasPurchaseValue = comparisonData.some(item => (item.period1?.purchase_value || 0) > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-black/20 border-b border-border-subtle">
            <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase">{t('common.name')}</th>
            <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.spend')}</th>
            <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.impressions')}</th>
            <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.clicks')}</th>
            <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.ctr')}</th>
            <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.cpc')}</th>
            <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.conversions')}</th>
            <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.cpa')}</th>
            {hasPurchaseValue && (
              <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.roas')}</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {comparisonData.map((item, idx) => {
            const metrics = item.period1;
            return (
              <tr key={item.id || idx} className="hover:bg-white/[0.02]">
                <td className="px-4 py-4 text-white font-medium">{item.name}</td>
                <td className="px-4 py-4 text-right text-white font-bold">{formatCurrency(metrics.spend)}</td>
                <td className="px-4 py-4 text-right text-gray-300">{formatNumber(metrics.impressions)}</td>
                <td className="px-4 py-4 text-right text-gray-300">{formatNumber(metrics.clicks)}</td>
                <td className="px-4 py-4 text-right text-gray-300">{formatPercent(metrics.ctr)}</td>
                <td className="px-4 py-4 text-right text-gray-300">{formatCurrencyDecimal(metrics.cpc)}</td>
                <td className="px-4 py-4 text-right text-gray-300">{formatNumber(metrics.conversions)}</td>
                <td className="px-4 py-4 text-right text-gray-300">{formatCurrencyDecimal(metrics.cpa)}</td>
                {hasPurchaseValue && (
                  <td className="px-4 py-4 text-right text-gray-300">{formatRoas(metrics.roas)}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ReportTable;
