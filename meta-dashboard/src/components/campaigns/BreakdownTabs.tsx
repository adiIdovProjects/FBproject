/**
 * BreakdownTabs Component
 * Tabbed interface for Placement, Demographics, Country, and Adset breakdowns
 */

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BreakdownRow, BreakdownType, DateRange } from '../../types/campaigns.types';
import { fetchBreakdown } from '../../services/campaigns.service';

interface BreakdownTabsProps {
  dateRange: DateRange;
  currency?: string;
  isRTL?: boolean;
}

type Tab = {
  id: BreakdownType;
  labelKey: string;
};

const TABS: Tab[] = [
  { id: 'adset', labelKey: 'adsets' },
  { id: 'platform', labelKey: 'platform' },
  { id: 'placement', labelKey: 'placement' },
  { id: 'age-gender', labelKey: 'demographics' },
  { id: 'country', labelKey: 'country' },
];

export const BreakdownTabs: React.FC<BreakdownTabsProps> = ({
  dateRange,
  currency = 'USD',
  isRTL = false,
}) => {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<BreakdownType>('adset');
  const [demographicSubTab, setDemographicSubTab] = useState<'age' | 'gender' | 'both'>('both');
  const [breakdownData, setBreakdownData] = useState<BreakdownRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch breakdown data when tab changes or date range changes
  useEffect(() => {
    const loadBreakdownData = async () => {
      if (!dateRange.startDate || !dateRange.endDate) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchBreakdown(dateRange, activeTab, demographicSubTab);
        setBreakdownData(data);
      } catch (err: any) {
        console.error('[BreakdownTabs] Error fetching breakdown:', err);
        setError(err.message || 'Failed to load breakdown data');
      } finally {
        setIsLoading(false);
      }
    };

    loadBreakdownData();
  }, [activeTab, demographicSubTab, dateRange.startDate, dateRange.endDate]);

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
    <div className="card-gradient rounded-2xl border border-border-subtle overflow-hidden shadow-2xl">
      {/* Tabs Header */}
      <div className="bg-black/20 border-b border-border-subtle">
        <div className={`flex items-end px-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative
                ${activeTab === tab.id
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
                }
              `}
            >
              <span className="relative z-10">{t(tab.labelKey)}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent shadow-[0_0_15px_rgba(99,102,241,0.6)] z-0 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Demographics Sub-tabs */}
      {activeTab === 'age-gender' && (
        <div className="px-6 py-3 border-b border-gray-700 bg-gray-750/50 flex gap-2">
          <button
            onClick={() => setDemographicSubTab('both')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${demographicSubTab === 'both' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-300 bg-gray-700'}`}
          >
            {t('both') || 'Both'}
          </button>
          <button
            onClick={() => setDemographicSubTab('age')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${demographicSubTab === 'age' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-300 bg-gray-700'}`}
          >
            {t('age') || 'Age'}
          </button>
          <button
            onClick={() => setDemographicSubTab('gender')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${demographicSubTab === 'gender' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-300 bg-gray-700'}`}
          >
            {t('gender') || 'Gender'}
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="p-6">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        )}

        {error && !isLoading && (
          <div className="flex items-center justify-center h-64 text-red-400">
            {error}
          </div>
        )}

        {!isLoading && !error && breakdownData.length === 0 && (
          <div className="flex items-center justify-center h-64 text-gray-400">
            {t('no_data_available')}
          </div>
        )}

        {!isLoading && !error && breakdownData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    {activeTab === 'adset' && t('ad_set_name')}
                    {activeTab === 'platform' && t('platform')}
                    {activeTab === 'placement' && t('placement')}
                    {activeTab === 'age-gender' && t('demographics')}
                    {activeTab === 'country' && t('country')}
                  </th>
                  {activeTab === 'adset' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        {t('targeting_type')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        {t('targeting_summary')}
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase font-mono">
                    {t('spend')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    {t('impressions')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    {t('clicks')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    {t('ctr')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    {t('cpc')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    {t('purchases')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    {t('roas')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    {t('cpa')}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-700">
                {breakdownData.map((row, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-750 transition-colors duration-150"
                  >
                    {/* Name */}
                    <td className="px-4 py-4 text-sm text-gray-200 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                      {row.name}
                    </td>

                    {/* Adset Specific Columns */}
                    {activeTab === 'adset' && (
                      <>
                        <td className="px-4 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.targeting_type === 'Lookalike' ? 'bg-purple-900/40 text-purple-300' :
                            row.targeting_type === 'List Audience' ? 'bg-amber-900/40 text-amber-300' :
                              row.targeting_type === 'Remarketing' ? 'bg-blue-900/40 text-blue-300' :
                                row.targeting_type === 'Interest Audience' ? 'bg-green-900/40 text-green-300' :
                                  row.targeting_type === 'Mix Audience' ? 'bg-indigo-900/40 text-indigo-300' :
                                    row.targeting_type === 'Advantage+' ? 'bg-teal-900/40 text-teal-300' :
                                      'bg-gray-700 text-gray-300'
                            }`}>
                            {row.targeting_type ? t(row.targeting_type.toLowerCase()) : t('broad')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-400 max-w-[300px] truncate">
                          {row.targeting_summary}
                        </td>
                      </>
                    )}

                    {/* Spend */}
                    <td className="px-4 py-4 text-sm text-gray-200 text-right font-mono">
                      {formatCurrency(row.spend)}
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
                      {formatCurrency(row.cpc)}
                    </td>

                    {/* Purchases */}
                    <td className="px-4 py-4 text-sm text-gray-200 text-right font-mono">
                      {formatNumber(row.purchases)}
                    </td>

                    {/* ROAS */}
                    <td className="px-4 py-4 text-sm text-gray-200 text-right font-mono">
                      {row.roas.toFixed(2)}
                    </td>

                    {/* CPA */}
                    <td className="px-4 py-4 text-sm text-gray-200 text-right font-mono">
                      {formatCurrency(row.cpa)}
                    </td>
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

export default BreakdownTabs;
