"use client";

/**
 * Manage Page - Campaign Hierarchy with Full Metrics
 * Shows Campaign -> Ad Set -> Ad hierarchy with expandable rows
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronRight, ChevronDown, Pause, Play, Loader2, Pencil, X, Check } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import DateFilter from '../../../components/DateFilter';

// Services & Types
import { mutationsService, BudgetInfo } from '../../../services/mutations.service';
import { HierarchyCampaign, HierarchyAdSet, HierarchyAd } from '../../../types/campaigns.types';
import { useAccount } from '../../../context/AccountContext';

// Utilities
import { formatDate, calculateDateRange } from '../../../utils/date';

const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

export default function ManagePage() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';
  const { selectedAccountId, currency } = useAccount();

  // Initialize date range
  const initialDates = useMemo(() => calculateDateRange(DEFAULT_DATE_RANGE_KEY), []);
  const [startDate, setStartDate] = useState<string | null>(formatDate(initialDates.start));
  const [endDate, setEndDate] = useState<string | null>(formatDate(initialDates.end));

  // Handle date range change from DateFilter
  const handleDateRangeChange = (newStart: string | null, newEnd: string | null) => {
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  // Data state
  const [campaigns, setCampaigns] = useState<HierarchyCampaign[]>([]);
  const [adsets, setAdsets] = useState<Record<number, HierarchyAdSet[]>>({});
  const [ads, setAds] = useState<Record<number, HierarchyAd[]>>({});

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<number>>(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState<Set<number>>(new Set());
  const [loadingAdsets, setLoadingAdsets] = useState<Set<number>>(new Set());
  const [loadingAds, setLoadingAds] = useState<Set<number>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Budget state
  const [campaignBudgets, setCampaignBudgets] = useState<Record<string, BudgetInfo>>({});
  const [adsetBudgets, setAdsetBudgets] = useState<Record<string, BudgetInfo>>({});
  const [editingBudget, setEditingBudget] = useState<{ type: 'campaign' | 'adset'; id: string; value: string } | null>(null);
  const [savingBudget, setSavingBudget] = useState(false);

  // Memoize the account ID to avoid dependency array issues
  const accountId = selectedAccountId || null;

  // Fetch campaigns on date change
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!startDate || !endDate || !accountId) return;

      setIsLoading(true);
      try {
        const data = await mutationsService.getHierarchyCampaigns(String(accountId), startDate, endDate);
        setCampaigns(data);

        // Fetch budgets for all campaigns
        if (data.length > 0) {
          const campaignIds = data.map((c: HierarchyCampaign) => String(c.campaign_id));
          try {
            const budgets = await mutationsService.getCampaignBudgets(campaignIds);
            setCampaignBudgets(budgets);
          } catch (err) {
            console.error('Failed to fetch campaign budgets:', err);
          }
        }
      } catch (error) {
        console.error('Failed to fetch campaigns:', error);
        setCampaigns([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaigns();
  }, [startDate, endDate, accountId]);

  // Handle campaign expand/collapse
  const handleCampaignExpand = async (campaignId: number) => {
    const isExpanded = expandedCampaigns.has(campaignId);

    if (isExpanded) {
      // Collapse
      setExpandedCampaigns(prev => {
        const next = new Set(prev);
        next.delete(campaignId);
        return next;
      });
    } else {
      // Expand - load adsets if not already loaded
      setExpandedCampaigns(prev => new Set(prev).add(campaignId));

      if (!adsets[campaignId] && accountId) {
        setLoadingAdsets(prev => new Set(prev).add(campaignId));
        try {
          const data = await mutationsService.getHierarchyAdSets(String(accountId), campaignId, startDate!, endDate!);
          setAdsets(prev => ({ ...prev, [campaignId]: data }));

          // Fetch budgets for adsets (only for ABO campaigns)
          const campaignBudget = campaignBudgets[String(campaignId)];
          if (!campaignBudget?.is_cbo && data.length > 0) {
            const adsetIds = data.map((a: HierarchyAdSet) => String(a.adset_id));
            try {
              const budgets = await mutationsService.getAdSetBudgets(adsetIds);
              setAdsetBudgets(prev => ({ ...prev, ...budgets }));
            } catch (err) {
              console.error('Failed to fetch adset budgets:', err);
            }
          }
        } catch (error) {
          console.error('Failed to fetch adsets:', error);
        } finally {
          setLoadingAdsets(prev => {
            const next = new Set(prev);
            next.delete(campaignId);
            return next;
          });
        }
      }
    }
  };

  // Handle adset expand/collapse
  const handleAdsetExpand = async (adsetId: number) => {
    const isExpanded = expandedAdsets.has(adsetId);

    if (isExpanded) {
      setExpandedAdsets(prev => {
        const next = new Set(prev);
        next.delete(adsetId);
        return next;
      });
    } else {
      setExpandedAdsets(prev => new Set(prev).add(adsetId));

      if (!ads[adsetId] && accountId) {
        setLoadingAds(prev => new Set(prev).add(adsetId));
        try {
          const data = await mutationsService.getHierarchyAds(String(accountId), adsetId, startDate!, endDate!);
          setAds(prev => ({ ...prev, [adsetId]: data }));
        } catch (error) {
          console.error('Failed to fetch ads:', error);
        } finally {
          setLoadingAds(prev => {
            const next = new Set(prev);
            next.delete(adsetId);
            return next;
          });
        }
      }
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (type: 'campaign' | 'adset' | 'ad', id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const action = newStatus === 'PAUSED' ? t('actions.pause') : t('actions.resume');

    if (!window.confirm(`${action}?`)) return;

    setUpdatingId(`${type}-${id}`);
    try {
      if (type === 'campaign') {
        await mutationsService.updateCampaignStatus(String(id), newStatus);
        setCampaigns(prev => prev.map(c =>
          c.campaign_id === id ? { ...c, campaign_status: newStatus } : c
        ));
      } else if (type === 'adset') {
        await mutationsService.updateAdSetStatus(String(id), newStatus);
        // Update in all adsets records
        setAdsets(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(campaignId => {
            updated[Number(campaignId)] = updated[Number(campaignId)].map(a =>
              a.adset_id === id ? { ...a, adset_status: newStatus } : a
            );
          });
          return updated;
        });
      } else if (type === 'ad') {
        await mutationsService.updateAdStatus(String(id), newStatus);
        // Update in all ads records
        setAds(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(adsetId => {
            updated[Number(adsetId)] = updated[Number(adsetId)].map(a =>
              a.ad_id === id ? { ...a, ad_status: newStatus } : a
            );
          });
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(t('errors.failed_to_update'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle budget save
  const handleBudgetSave = async () => {
    if (!editingBudget) return;

    const budgetValue = parseFloat(editingBudget.value);
    if (isNaN(budgetValue) || budgetValue <= 0) {
      alert(t('manage.invalid_budget'));
      return;
    }

    const budgetCents = Math.round(budgetValue * 100);
    setSavingBudget(true);

    try {
      if (editingBudget.type === 'campaign') {
        await mutationsService.updateCampaignBudget(editingBudget.id, budgetCents);
        setCampaignBudgets(prev => ({
          ...prev,
          [editingBudget.id]: { ...prev[editingBudget.id], daily_budget_cents: budgetCents }
        }));
      } else {
        await mutationsService.updateAdSetBudget(editingBudget.id, budgetCents);
        setAdsetBudgets(prev => ({
          ...prev,
          [editingBudget.id]: { ...prev[editingBudget.id], daily_budget_cents: budgetCents }
        }));
      }
      setEditingBudget(null);
    } catch (error) {
      console.error('Failed to update budget:', error);
      alert(t('errors.failed_to_update'));
    } finally {
      setSavingBudget(false);
    }
  };

  // Format budget for display
  const formatBudget = (cents: number | null | undefined): string => {
    if (cents === null || cents === undefined) return '-';
    return formatCurrency(cents / 100);
  };

  // Render budget cell with edit capability
  const renderBudgetCell = (type: 'campaign' | 'adset', id: number, isCbo: boolean) => {
    const idStr = String(id);
    const budgetInfo = type === 'campaign' ? campaignBudgets[idStr] : adsetBudgets[idStr];
    const budgetCents = budgetInfo?.daily_budget_cents;

    // For campaigns: show budget if CBO, else show "ABO" indicator
    // For adsets: show budget if ABO (parent is not CBO)
    if (type === 'campaign' && !isCbo) {
      return <span className="text-gray-500 text-xs">ABO</span>;
    }

    if (type === 'adset' && isCbo) {
      return <span className="text-gray-500 text-xs">-</span>;
    }

    const isEditing = editingBudget?.type === type && editingBudget?.id === idStr;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.01"
            min="0"
            value={editingBudget.value}
            onChange={(e) => setEditingBudget({ ...editingBudget, value: e.target.value })}
            className="w-20 px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white text-right"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleBudgetSave();
              if (e.key === 'Escape') setEditingBudget(null);
            }}
          />
          <button
            onClick={handleBudgetSave}
            disabled={savingBudget}
            className="p-1 hover:bg-green-900/50 rounded text-green-400"
          >
            {savingBudget ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setEditingBudget(null)}
            className="p-1 hover:bg-red-900/50 rounded text-red-400"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-1 group">
        <span>{formatBudget(budgetCents)}</span>
        {budgetCents !== null && budgetCents !== undefined && (
          <button
            onClick={() => setEditingBudget({ type, id: idStr, value: String(budgetCents / 100) })}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-opacity"
            title={t('manage.edit_budget')}
          >
            <Pencil className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>
    );
  };

  // Format helpers
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format currency with 1 decimal (CPC, CPA)
  const formatCurrencyDecimal = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  };

  const formatNumber = (value: number): string => value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const formatPercent = (value: number): string => `${value.toFixed(2)}%`;

  // Status badge
  const renderStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-900/30 text-green-400 border-green-600',
      PAUSED: 'bg-yellow-900/30 text-yellow-400 border-yellow-600',
      ARCHIVED: 'bg-gray-700 text-gray-400 border-gray-600',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-md border ${colors[status.toUpperCase()] || colors.ARCHIVED}`}>
        {status}
      </span>
    );
  };

  // Action button
  const renderActionButton = (type: 'campaign' | 'adset' | 'ad', id: number, status: string) => {
    const isUpdating = updatingId === `${type}-${id}`;
    const isActive = status === 'ACTIVE';

    if (status === 'ARCHIVED') return null;

    return (
      <button
        onClick={() => handleStatusToggle(type, id, status)}
        disabled={isUpdating}
        className={`p-2 rounded-lg transition-colors ${
          isActive
            ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50 border border-yellow-600'
            : 'bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-600'
        } disabled:opacity-50`}
        title={isActive ? t('actions.pause') : t('actions.resume')}
      >
        {isUpdating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isActive ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>
    );
  };

  return (
    <MainLayout
      title={t('nav.campaign_control')}
      description={t('manage.subtitle')}
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
          lang={locale as any}
          t={t}
          isRTL={isRTL}
        />
      </div>

      {/* Table */}
      <div className="card-gradient rounded-2xl border border-border-subtle overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/20 border-b border-border-subtle">
                  <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase w-12"></th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase min-w-[250px]">{t('common.name')}</th>
                  <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase">{t('common.status')}</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('manage.daily_budget')}</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.spend')}</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.impressions')}</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.clicks')}</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.ctr')}</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.cpc')}</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.conversions')}</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.cpa')}</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-gray-500 uppercase">{t('metrics.conversion_rate')}</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-gray-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {isLoading ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-2" />
                      <span className="text-gray-500">{t('common.loading')}</span>
                    </td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-12 text-center text-gray-500">
                      {t('campaigns.no_data')}
                    </td>
                  </tr>
                ) : (
                  campaigns.map(campaign => {
                    const campaignBudgetInfo = campaignBudgets[String(campaign.campaign_id)];
                    const isCbo = campaignBudgetInfo?.is_cbo ?? false;

                    return (
                    <React.Fragment key={`campaign-${campaign.campaign_id}`}>
                      {/* Campaign Row */}
                      <tr className="hover:bg-white/[0.02]">
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleCampaignExpand(campaign.campaign_id)}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            {expandedCampaigns.has(campaign.campaign_id) ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-white">{campaign.campaign_name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{campaign.campaign_id}</div>
                        </td>
                        <td className="px-4 py-4">{renderStatusBadge(campaign.campaign_status)}</td>
                        <td className="px-4 py-4 text-right text-gray-300">
                          {renderBudgetCell('campaign', campaign.campaign_id, isCbo)}
                        </td>
                        <td className="px-4 py-4 text-right text-white font-bold">{formatCurrency(campaign.spend)}</td>
                        <td className="px-4 py-4 text-right text-gray-300">{formatNumber(campaign.impressions)}</td>
                        <td className="px-4 py-4 text-right text-gray-300">{formatNumber(campaign.clicks)}</td>
                        <td className="px-4 py-4 text-right text-gray-300">{formatPercent(campaign.ctr)}</td>
                        <td className="px-4 py-4 text-right text-gray-300">{formatCurrencyDecimal(campaign.cpc)}</td>
                        <td className="px-4 py-4 text-right text-gray-300">{formatNumber(campaign.conversions)}</td>
                        <td className="px-4 py-4 text-right text-gray-300">{formatCurrencyDecimal(campaign.cpa)}</td>
                        <td className="px-4 py-4 text-right text-gray-300">{formatPercent(campaign.conv_rate)}</td>
                        <td className="px-4 py-4 text-center">
                          {renderActionButton('campaign', campaign.campaign_id, campaign.campaign_status)}
                        </td>
                      </tr>

                      {/* Ad Sets (when expanded) */}
                      {expandedCampaigns.has(campaign.campaign_id) && (
                        <>
                          {loadingAdsets.has(campaign.campaign_id) ? (
                            <tr key={`loading-adsets-${campaign.campaign_id}`}>
                              <td colSpan={13} className="px-6 py-4 text-center bg-black/10">
                                <Loader2 className="w-5 h-5 text-gray-400 animate-spin mx-auto" />
                              </td>
                            </tr>
                          ) : (
                            (adsets[campaign.campaign_id] || []).map(adset => (
                              <React.Fragment key={`adset-${adset.adset_id}`}>
                                {/* Ad Set Row */}
                                <tr className="bg-black/10 hover:bg-black/20">
                                  <td className="px-4 py-3 pl-8">
                                    <button
                                      onClick={() => handleAdsetExpand(adset.adset_id)}
                                      className="p-1 hover:bg-white/10 rounded"
                                    >
                                      {expandedAdsets.has(adset.adset_id) ? (
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                      )}
                                    </button>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-gray-300 pl-4">{adset.adset_name}</div>
                                    <div className="text-[10px] text-gray-600 font-mono pl-4">{adset.adset_id}</div>
                                  </td>
                                  <td className="px-4 py-3">{renderStatusBadge(adset.adset_status)}</td>
                                  <td className="px-4 py-3 text-right text-gray-400">
                                    {renderBudgetCell('adset', adset.adset_id, isCbo)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(adset.spend)}</td>
                                  <td className="px-4 py-3 text-right text-gray-400">{formatNumber(adset.impressions)}</td>
                                  <td className="px-4 py-3 text-right text-gray-400">{formatNumber(adset.clicks)}</td>
                                  <td className="px-4 py-3 text-right text-gray-400">{formatPercent(adset.ctr)}</td>
                                  <td className="px-4 py-3 text-right text-gray-400">{formatCurrencyDecimal(adset.cpc)}</td>
                                  <td className="px-4 py-3 text-right text-gray-400">{formatNumber(adset.conversions)}</td>
                                  <td className="px-4 py-3 text-right text-gray-400">{formatCurrencyDecimal(adset.cpa)}</td>
                                  <td className="px-4 py-3 text-right text-gray-400">{formatPercent(adset.conv_rate)}</td>
                                  <td className="px-4 py-3 text-center">
                                    {renderActionButton('adset', adset.adset_id, adset.adset_status)}
                                  </td>
                                </tr>

                                {/* Ads (when expanded) */}
                                {expandedAdsets.has(adset.adset_id) && (
                                  <>
                                    {loadingAds.has(adset.adset_id) ? (
                                      <tr key={`loading-ads-${adset.adset_id}`}>
                                        <td colSpan={13} className="px-6 py-3 text-center bg-black/20">
                                          <Loader2 className="w-4 h-4 text-gray-500 animate-spin mx-auto" />
                                        </td>
                                      </tr>
                                    ) : (
                                      (ads[adset.adset_id] || []).map(ad => (
                                        <tr key={`ad-${ad.ad_id}`} className="bg-black/20 hover:bg-black/30">
                                          <td className="px-4 py-2 pl-12"></td>
                                          <td className="px-4 py-2">
                                            <div className="text-gray-400 pl-8 text-sm">{ad.ad_name}</div>
                                            <div className="text-[10px] text-gray-600 font-mono pl-8">{ad.ad_id}</div>
                                          </td>
                                          <td className="px-4 py-2">{renderStatusBadge(ad.ad_status)}</td>
                                          <td className="px-4 py-2 text-right text-gray-500 text-sm">-</td>
                                          <td className="px-4 py-2 text-right text-gray-400 text-sm">{formatCurrency(ad.spend)}</td>
                                          <td className="px-4 py-2 text-right text-gray-500 text-sm">{formatNumber(ad.impressions)}</td>
                                          <td className="px-4 py-2 text-right text-gray-500 text-sm">{formatNumber(ad.clicks)}</td>
                                          <td className="px-4 py-2 text-right text-gray-500 text-sm">{formatPercent(ad.ctr)}</td>
                                          <td className="px-4 py-2 text-right text-gray-500 text-sm">{formatCurrencyDecimal(ad.cpc)}</td>
                                          <td className="px-4 py-2 text-right text-gray-500 text-sm">{formatNumber(ad.conversions)}</td>
                                          <td className="px-4 py-2 text-right text-gray-500 text-sm">{formatCurrencyDecimal(ad.cpa)}</td>
                                          <td className="px-4 py-2 text-right text-gray-500 text-sm">{formatPercent(ad.conv_rate)}</td>
                                          <td className="px-4 py-2 text-center">
                                            {renderActionButton('ad', ad.ad_id, ad.ad_status)}
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </>
                                )}
                              </React.Fragment>
                            ))
                          )}
                        </>
                      )}
                    </React.Fragment>
                  );})
                )}
              </tbody>
            </table>
          </div>
      </div>
    </MainLayout>
  );
}
