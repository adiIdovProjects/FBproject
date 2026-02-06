"use client";

/**
 * BreakdownTabs Component
 * Tabbed interface for Placement, Demographics, Country, and Adset breakdowns
 */

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { InfoTooltip } from '../ui/InfoTooltip';
import { BreakdownRow, BreakdownType, DateRange } from '../../types/campaigns.types';
import { fetchBreakdown } from '../../services/campaigns.service';

interface BreakdownTabsProps {
  dateRange: DateRange;
  currency?: string;
  isRTL?: boolean;
  statusFilter?: string[];
  searchQuery?: string;
  accountId?: string | null;
  campaignIds?: number[] | null; // Optional: filter by specific campaigns
  isVisible?: boolean; // Triggers initial load when section enters viewport
}

type Tab = {
  id: BreakdownType;
  labelKey: string;
  helpKey?: string;
};

const TABS: Tab[] = [
  { id: 'adset', labelKey: 'campaigns.adsets' },
  { id: 'ad', labelKey: 'campaigns.ads' },
  { id: 'platform', labelKey: 'campaigns.platform', helpKey: 'campaigns.platform_help' },
  { id: 'placement', labelKey: 'campaigns.placement', helpKey: 'campaigns.placement_help' },
  { id: 'age-gender', labelKey: 'campaigns.demographics', helpKey: 'campaigns.demographics_help' },
  { id: 'country', labelKey: 'campaigns.country', helpKey: 'campaigns.country_help' },
];

// Tabs that don't have conversion data from Facebook API
const SPECIAL_BREAKDOWN_TABS: BreakdownType[] = ['platform', 'placement', 'age-gender', 'country'];

export const BreakdownTabs: React.FC<BreakdownTabsProps> = ({
  dateRange,
  currency = 'USD',
  isRTL = false,
  statusFilter = [],
  searchQuery = '',
  accountId = null,
  campaignIds = null,
  isVisible = false,
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<BreakdownType>('adset');
  const [demographicSubTab, setDemographicSubTab] = useState<'age' | 'gender' | 'both'>('both');
  const [breakdownData, setBreakdownData] = useState<BreakdownRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if component has been interacted with (lazy loading)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Check if any row has conversion value
  const hasConversionValue = breakdownData.some(row => (row.conversion_value || 0) > 0);

  // Auto-load when section becomes visible in viewport
  useEffect(() => {
    if (isVisible && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [isVisible, hasLoadedOnce]);

  // Fetch breakdown data when tab changes or date range changes (only after first interaction or visibility)
  useEffect(() => {
    const loadBreakdownData = async () => {
      if (!dateRange.startDate || !dateRange.endDate || !hasLoadedOnce) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchBreakdown(dateRange, activeTab, demographicSubTab, statusFilter, searchQuery, accountId, null, campaignIds);
        setBreakdownData(data);
      } catch (err: any) {
        console.error('[BreakdownTabs] Error fetching breakdown:', err);
        setError(err.message || 'Failed to load breakdown data');
      } finally {
        setIsLoading(false);
      }
    };

    loadBreakdownData();
  }, [activeTab, demographicSubTab, dateRange.startDate, dateRange.endDate, hasLoadedOnce, statusFilter, searchQuery, accountId, campaignIds]);

  // Load data on first tab click
  const handleTabClick = (tabId: BreakdownType) => {
    setActiveTab(tabId);
    if (!hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  };

  // Format currency
  const formatCurrency = (value: number, decimals: number = 0): string => {
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

  // Map of English country names to ISO 3166-1 alpha-2 codes
  const countryToCode: Record<string, string> = {
    'United States': 'US', 'Israel': 'IL', 'Germany': 'DE', 'France': 'FR',
    'United Kingdom': 'GB', 'Canada': 'CA', 'Australia': 'AU', 'Spain': 'ES',
    'Italy': 'IT', 'Netherlands': 'NL', 'Brazil': 'BR', 'Mexico': 'MX',
    'Japan': 'JP', 'India': 'IN', 'South Korea': 'KR', 'China': 'CN',
    'Russia': 'RU', 'Turkey': 'TR', 'Saudi Arabia': 'SA', 'United Arab Emirates': 'AE',
    'Poland': 'PL', 'Sweden': 'SE', 'Belgium': 'BE', 'Switzerland': 'CH',
    'Austria': 'AT', 'Norway': 'NO', 'Denmark': 'DK', 'Finland': 'FI',
    'Portugal': 'PT', 'Greece': 'GR', 'Ireland': 'IE', 'New Zealand': 'NZ',
    'Singapore': 'SG', 'Hong Kong': 'HK', 'Taiwan': 'TW', 'Thailand': 'TH',
    'Malaysia': 'MY', 'Indonesia': 'ID', 'Philippines': 'PH', 'Vietnam': 'VN',
    'Argentina': 'AR', 'Chile': 'CL', 'Colombia': 'CO', 'Peru': 'PE',
    'Egypt': 'EG', 'South Africa': 'ZA', 'Nigeria': 'NG', 'Kenya': 'KE',
    'Morocco': 'MA', 'Pakistan': 'PK', 'Bangladesh': 'BD', 'Ukraine': 'UA',
    'Czech Republic': 'CZ', 'Romania': 'RO', 'Hungary': 'HU', 'Slovakia': 'SK',
  };

  // Translate country name using Intl.DisplayNames
  const translateCountry = (countryName: string): string => {
    const code = countryToCode[countryName];
    if (!code) return countryName;
    try {
      const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
      return displayNames.of(code) || countryName;
    } catch {
      return countryName;
    }
  };

  // Translate breakdown value (gender, platform, placement, country)
  const translateValue = (value: string): string => {
    if (!value) return t('breakdown.values.unknown');

    // For country tab, use Intl.DisplayNames
    if (activeTab === 'country') {
      return translateCountry(value);
    }

    // For age-gender combined values like "65+ | female", translate only the gender part
    if (activeTab === 'age-gender' && demographicSubTab === 'both' && value.includes(' | ')) {
      const [age, gender] = value.split(' | ');
      const genderKey = gender.toLowerCase();
      const genderTranslationKey = `breakdown.values.${genderKey}`;
      const translatedGender = t.has(genderTranslationKey) ? t(genderTranslationKey) : gender;
      return `${age} | ${translatedGender}`;
    }

    // For other tabs, use translation lookup
    const key = value.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    const translationKey = `breakdown.values.${key}`;
    return t.has(translationKey) ? t(translationKey) : value;
  };

  return (
    <div className="card-gradient rounded-2xl border border-border-subtle overflow-hidden shadow-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Tabs Header */}
      <div className="bg-black/20 border-b border-border-subtle">
        <div className="flex items-end px-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                px-6 py-5 text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative
                ${activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-text-muted hover:text-foreground'
                }
              `}
            >
              <span className="relative z-10 flex items-center gap-1">
                {t(tab.labelKey)}
                {tab.helpKey && <InfoTooltip tooltipKey={tab.helpKey} size="sm" />}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent shadow-[0_0_15px_rgba(99,102,241,0.6)] z-0 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Demographics Sub-tabs */}
      {activeTab === 'age-gender' && (
        <div className="px-6 py-3 border-b border-border-subtle bg-card/50 flex gap-2">
          <button
            onClick={() => setDemographicSubTab('both')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${demographicSubTab === 'both' ? 'bg-indigo-600 text-foreground' : 'text-text-muted hover:text-foreground bg-secondary'}`}
          >
            {t('breakdown.both') || 'Both'}
          </button>
          <button
            onClick={() => setDemographicSubTab('age')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${demographicSubTab === 'age' ? 'bg-indigo-600 text-foreground' : 'text-text-muted hover:text-foreground bg-secondary'}`}
          >
            {t('breakdown.age') || 'Age'}
          </button>
          <button
            onClick={() => setDemographicSubTab('gender')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${demographicSubTab === 'gender' ? 'bg-indigo-600 text-foreground' : 'text-text-muted hover:text-foreground bg-secondary'}`}
          >
            {t('breakdown.gender') || 'Gender'}
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="p-6">
        {!hasLoadedOnce && !isLoading && (
          <div className="flex items-center justify-center h-64 text-text-muted">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">{t('campaigns.click_tab_to_load') || 'Click a tab to load breakdown data'}</p>
              <p className="text-sm text-text-muted">{t('campaigns.breakdown_lazy_load') || 'Data will load when you select a breakdown type'}</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        )}

        {error && !isLoading && hasLoadedOnce && (
          <div className="flex items-center justify-center h-64 text-red-400">
            {error}
          </div>
        )}

        {!isLoading && !error && hasLoadedOnce && breakdownData.length === 0 && (
          <div className="flex items-center justify-center h-64 text-text-muted">
            {t('common.no_data_available')}
          </div>
        )}

        {!isLoading && !error && hasLoadedOnce && breakdownData.length > 0 && (
          <div className="overflow-x-auto">
            {SPECIAL_BREAKDOWN_TABS.includes(activeTab) && (
              <p className="text-xs text-text-muted mb-3 px-1">{t('breakdown.no_conversion_data')}</p>
            )}
            <table className="w-full">
              <thead className="bg-card border-b border-border-subtle">
                <tr>
                  <th className={`px-4 py-3 text-xs font-medium text-text-muted uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                    {activeTab === 'adset' && t('breakdown.ad_set_name')}
                    {activeTab === 'ad' && t('breakdown.ad_name')}
                    {activeTab === 'platform' && t('campaigns.platform')}
                    {activeTab === 'placement' && t('campaigns.placement')}
                    {activeTab === 'age-gender' && t('campaigns.demographics')}
                    {activeTab === 'country' && t('campaigns.country')}
                  </th>
                  {activeTab === 'adset' && (
                    <th className={`px-4 py-3 text-xs font-medium text-text-muted uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('breakdown.targeting_type')}
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase font-mono">
                    {t('metrics.spend')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">
                    {t('metrics.impressions')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">
                    {t('metrics.clicks')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">
                    {t('metrics.ctr')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">
                    {t('metrics.cpc')}
                  </th>
                  {hasConversionValue && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">
                      {t('metrics.roas')}
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-border-subtle">
                {breakdownData.map((row, index) => (
                  <tr
                    key={index}
                    className="hover:bg-row-hover transition-colors duration-150"
                  >
                    {/* Name */}
                    <td className={`px-4 py-4 text-sm text-foreground font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] ${isRTL ? 'text-right' : 'text-left'}`}>
                      {translateValue(row.name)}
                    </td>

                    {/* Adset Specific Columns */}
                    {activeTab === 'adset' && (
                      <td className="px-4 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row.targeting_type === 'Broad' ? 'bg-blue-900/40 text-blue-300' :
                          row.targeting_type === 'Lookalike' ? 'bg-purple-900/40 text-purple-300' :
                          row.targeting_type === 'Interest' ? 'bg-green-900/40 text-green-300' :
                          row.targeting_type === 'Custom Audience' ? 'bg-orange-900/40 text-orange-300' :
                          row.targeting_type === 'List Audience' ? 'bg-amber-900/40 text-amber-300' :
                          row.targeting_type === 'Remarketing' ? 'bg-cyan-900/40 text-cyan-300' :
                          row.targeting_type === 'Interest Audience' ? 'bg-green-900/40 text-green-300' :
                          row.targeting_type === 'Mix Audience' ? 'bg-indigo-900/40 text-indigo-300' :
                          row.targeting_type === 'Advantage+' ? 'bg-teal-900/40 text-teal-300' :
                          'bg-secondary text-foreground'
                        }`}>
                          {t.has(`targeting.types.${row.targeting_type}`) ? t(`targeting.types.${row.targeting_type}`) : (row.targeting_type || t('targeting.types.Broad'))}
                        </span>
                      </td>
                    )}

                    {/* Spend */}
                    <td className="px-4 py-4 text-sm text-foreground text-right font-mono">
                      {formatCurrency(row.spend)}
                    </td>

                    {/* Impressions */}
                    <td className="px-4 py-4 text-sm text-foreground text-right font-mono">
                      {formatNumber(row.impressions)}
                    </td>

                    {/* Clicks */}
                    <td className="px-4 py-4 text-sm text-foreground text-right font-mono">
                      {formatNumber(row.clicks)}
                    </td>

                    {/* CTR */}
                    <td className="px-4 py-4 text-sm text-foreground text-right font-mono">
                      {formatPercentage(row.ctr)}
                    </td>

                    {/* CPC */}
                    <td className="px-4 py-4 text-sm text-foreground text-right font-mono">
                      {formatCurrency(row.cpc)}
                    </td>

                    {/* ROAS */}
                    {hasConversionValue && (
                      <td className="px-4 py-4 text-sm text-foreground text-right font-mono">
                        {row.conversions > 0 ? row.roas.toFixed(2) : 'N/A'}
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

export default BreakdownTabs;
