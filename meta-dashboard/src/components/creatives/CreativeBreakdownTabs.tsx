"use client";

/**
 * CreativeBreakdownTabs Component
 * Breakdown analysis for creative performance by placement, demographics, and country
 */

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BreakdownRow, BreakdownType, DateRange } from '../../types/campaigns.types';
import { fetchBreakdown } from '../../services/campaigns.service';

interface CreativeBreakdownTabsProps {
  dateRange: DateRange;
  currency?: string;
  isRTL?: boolean;
  accountId?: string | null;
  creativeId?: number | null;  // Optional: filter by specific creative
}

type CreativeBreakdownType = 'placement' | 'age-gender' | 'country';

type Tab = {
  id: CreativeBreakdownType;
  labelKey: string;
};

const TABS: Tab[] = [
  { id: 'placement', labelKey: 'campaigns.placement' },
  { id: 'age-gender', labelKey: 'campaigns.demographics' },
  { id: 'country', labelKey: 'campaigns.country' },
];

export const CreativeBreakdownTabs: React.FC<CreativeBreakdownTabsProps> = ({
  dateRange,
  currency = 'USD',
  isRTL = false,
  accountId = null,
  creativeId = null,
}) => {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<CreativeBreakdownType>('placement');
  const [demographicSubTab, setDemographicSubTab] = useState<'age' | 'gender' | 'both'>('both');
  const [breakdownData, setBreakdownData] = useState<BreakdownRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if component has been interacted with (lazy loading)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Check if any row has conversion value
  const hasConversionValue = breakdownData.some(row => (row.conversion_value || 0) > 0);

  // Fetch breakdown data when tab changes or date range changes
  useEffect(() => {
    const loadBreakdownData = async () => {
      if (!dateRange.startDate || !dateRange.endDate || !hasLoadedOnce) return;

      setIsLoading(true);
      setError(null);

      try {
        // Note: fetchBreakdown from campaigns.service should be updated to support creative_id
        // For now, we'll pass it through statusFilter as a workaround
        const data = await fetchBreakdown(
          dateRange,
          activeTab as BreakdownType,
          demographicSubTab,
          [], // statusFilter
          '', // searchQuery
          accountId,
          creativeId // Pass creative_id
        );
        setBreakdownData(data);
      } catch (err: any) {
        console.error('[CreativeBreakdownTabs] Error fetching breakdown:', err);
        setError(err.message || 'Failed to load breakdown data');
      } finally {
        setIsLoading(false);
      }
    };

    loadBreakdownData();
  }, [activeTab, demographicSubTab, dateRange.startDate, dateRange.endDate, hasLoadedOnce, accountId, creativeId]);

  // Handle tab click (lazy load on first interaction)
  const handleTabClick = (tab: CreativeBreakdownType) => {
    setActiveTab(tab);
    if (!hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
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

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border-subtle">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Demographics Sub-tabs */}
      {activeTab === 'age-gender' && (
        <div className="flex items-center gap-2">
          {(['both', 'age', 'gender'] as const).map((subTab) => (
            <button
              key={subTab}
              onClick={() => setDemographicSubTab(subTab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                demographicSubTab === subTab
                  ? 'bg-accent text-white'
                  : 'bg-card-bg/40 text-gray-400 hover:text-gray-300'
              }`}
            >
              {subTab === 'both' ? 'Age & Gender' : subTab === 'age' ? 'Age Only' : 'Gender Only'}
            </button>
          ))}
        </div>
      )}

      {/* Breakdown Table */}
      <div className="card-gradient rounded-2xl border border-border-subtle overflow-hidden shadow-2xl">
        {!hasLoadedOnce ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">Click a tab to load breakdown data</p>
          </div>
        ) : isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Loading breakdown...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => setHasLoadedOnce(true)}
              className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-white transition-colors"
            >
              Retry
            </button>
          </div>
        ) : breakdownData.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No breakdown data available for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/20 border-b border-border-subtle">
                  <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {activeTab === 'placement' ? 'Placement' : activeTab === 'country' ? 'Country' : 'Segment'}
                  </th>
                  <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {t('metrics.spend')}
                  </th>
                  <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {t('metrics.impressions')}
                  </th>
                  <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {t('metrics.clicks')}
                  </th>
                  <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {t('metrics.ctr')}
                  </th>
                  <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {t('metrics.cpc')}
                  </th>
                  {hasConversionValue && (
                    <>
                      <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {t('metrics.roas')}
                      </th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.03]">
                {breakdownData.map((row, index) => (
                  <tr
                    key={index}
                    className="group hover:bg-white/[0.02] transition-colors duration-150"
                  >
                    <td className="px-6 py-5 text-sm text-white font-medium">
                      {row.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                      {formatCurrency(row.spend)}
                    </td>
                    <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                      {formatNumber(row.impressions)}
                    </td>
                    <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                      {formatNumber(row.clicks)}
                    </td>
                    <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                      {formatPercentage(row.ctr)}
                    </td>
                    <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                      {formatCurrency(row.cpc)}
                    </td>
                    {hasConversionValue && (
                      <td className="px-6 py-5 text-sm text-white text-right font-black tracking-tighter">
                        {row.roas !== null && row.roas !== undefined && row.roas > 0 ? (
                          <>
                            <span className="text-gray-400 text-[10px] mr-1">x</span>
                            {row.roas.toFixed(2)}
                          </>
                        ) : (
                          <span className="text-gray-500 italic text-[10px]">N/A</span>
                        )}
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

export default CreativeBreakdownTabs;
