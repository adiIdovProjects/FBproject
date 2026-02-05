"use client";

/**
 * CampaignControlTable - Reusable campaign hierarchy table with full controls
 * Shows Campaign -> Ad Set -> Ad hierarchy with expandable rows, status toggle, budget editing
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, ChevronDown, ChevronLeft, Pause, Play, Loader2, Pencil, X, Check, HelpCircle } from 'lucide-react';

// Services & Types
import { mutationsService, BudgetInfo } from '../../services/mutations.service';
import { HierarchyCampaign, HierarchyAdSet, HierarchyAd } from '../../types/campaigns.types';
import StatusConfirmModal from './StatusConfirmModal';

// Tooltip component for metric explanations
const MetricTooltip: React.FC<{ tooltipKey: string; children: React.ReactNode }> = ({ tooltipKey, children }) => {
  const t = useTranslations();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="text-text-muted hover:text-foreground transition-colors"
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-foreground bg-card rounded-lg shadow-lg border border-border-subtle whitespace-nowrap">
          {t(tooltipKey)}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-card" />
        </div>
      )}
    </span>
  );
};

interface CampaignControlTableProps {
  accountId: string | null;
  currency: string;
  locale: string;
  startDate: string;
  endDate: string;
  hideActions?: boolean;
  statusFilter?: string;
  selectedCampaignIds?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  campaignIdFilter?: number[];
}

export default function CampaignControlTable({
  accountId,
  currency,
  locale,
  startDate,
  endDate,
  hideActions = false,
  statusFilter = '',
  selectedCampaignIds = [],
  onSelectionChange,
  campaignIdFilter,
}: CampaignControlTableProps) {
  const t = useTranslations();
  const isRTL = locale === 'ar' || locale === 'he';

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

  // Status modal state
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    type: 'campaign' | 'adset' | 'ad';
    id: number;
    name: string;
    currentStatus: string;
    dailySpend?: number;
  } | null>(null);

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

  // Filter campaigns by status and campaign ID filter
  const filteredCampaigns = useMemo(() => {
    let result = campaigns;
    if (statusFilter) {
      result = result.filter(c => c.campaign_status === statusFilter);
    }
    if (campaignIdFilter && campaignIdFilter.length > 0) {
      result = result.filter(c => campaignIdFilter.includes(c.campaign_id));
    }
    return result;
  }, [campaigns, statusFilter, campaignIdFilter]);

  // Selection handlers for checkbox functionality
  const handleCheckboxToggle = (campaignId: number) => {
    if (!onSelectionChange) return;
    const isSelected = selectedCampaignIds.includes(campaignId);
    const newSelection = isSelected
      ? selectedCampaignIds.filter(id => id !== campaignId)
      : [...selectedCampaignIds, campaignId];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedCampaignIds.length === filteredCampaigns.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredCampaigns.map(c => c.campaign_id));
    }
  };

  const allSelected = filteredCampaigns.length > 0 && selectedCampaignIds.length === filteredCampaigns.length;
  const someSelected = selectedCampaignIds.length > 0 && selectedCampaignIds.length < filteredCampaigns.length;

  // Handle campaign expand/collapse
  const handleCampaignExpand = async (campaignId: number) => {
    const isExpanded = expandedCampaigns.has(campaignId);

    if (isExpanded) {
      setExpandedCampaigns(prev => {
        const next = new Set(prev);
        next.delete(campaignId);
        return next;
      });
    } else {
      setExpandedCampaigns(prev => new Set(prev).add(campaignId));

      if (!adsets[campaignId] && accountId) {
        setLoadingAdsets(prev => new Set(prev).add(campaignId));
        try {
          const data = await mutationsService.getHierarchyAdSets(String(accountId), campaignId, startDate, endDate);
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
          const data = await mutationsService.getHierarchyAds(String(accountId), adsetId, startDate, endDate);
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

  // Open status confirmation modal
  const openStatusModal = (type: 'campaign' | 'adset' | 'ad', id: number, name: string, currentStatus: string, dailySpend?: number) => {
    setStatusModal({ isOpen: true, type, id, name, currentStatus, dailySpend });
  };

  // Handle status toggle (called from modal confirmation)
  const handleStatusConfirm = async () => {
    if (!statusModal) return;

    const { type, id, currentStatus } = statusModal;
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

    setUpdatingId(`${type}-${id}`);
    try {
      if (type === 'campaign') {
        await mutationsService.updateCampaignStatus(String(id), newStatus);
        setCampaigns(prev => prev.map(c =>
          c.campaign_id === id ? { ...c, campaign_status: newStatus } : c
        ));
      } else if (type === 'adset') {
        await mutationsService.updateAdSetStatus(String(id), newStatus);
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
      setStatusModal(null);
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
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  };

  const formatNumber = (value: number): string => value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const formatPercent = (value: number): string => `${value.toFixed(2)}%`;

  const formatBudget = (cents: number | null | undefined): string => {
    if (cents === null || cents === undefined) return '-';
    return formatCurrency(cents / 100);
  };

  // Render budget cell with edit capability
  const renderBudgetCell = (type: 'campaign' | 'adset', id: number, isCbo: boolean) => {
    const idStr = String(id);
    const budgetInfo = type === 'campaign' ? campaignBudgets[idStr] : adsetBudgets[idStr];
    const budgetCents = budgetInfo?.daily_budget_cents;

    if (type === 'campaign' && !isCbo) {
      return <span className="text-text-muted text-xs">ABO</span>;
    }

    if (type === 'adset' && isCbo) {
      return <span className="text-text-muted text-xs">-</span>;
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
            className="w-20 px-2 py-1 text-sm bg-input border border-border-subtle rounded text-foreground text-right"
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
            <Pencil className="w-3 h-3 text-text-muted" />
          </button>
        )}
      </div>
    );
  };

  // Status badge
  const renderStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-900/30 text-green-400 border-green-600',
      PAUSED: 'bg-yellow-900/30 text-yellow-400 border-yellow-600',
      ARCHIVED: 'bg-secondary text-text-muted border-border-subtle',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-md border ${colors[status.toUpperCase()] || colors.ARCHIVED}`}>
        {status}
      </span>
    );
  };

  // Action button
  const renderActionButton = (type: 'campaign' | 'adset' | 'ad', id: number, name: string, status: string, dailySpend?: number) => {
    const isUpdating = updatingId === `${type}-${id}`;
    const isActive = status === 'ACTIVE';

    if (status === 'ARCHIVED') return null;

    return (
      <button
        onClick={() => openStatusModal(type, id, name, status, dailySpend)}
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
    <div className="card-gradient rounded-2xl border border-border-subtle overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" dir={isRTL ? 'rtl' : 'ltr'}>
          <thead>
            <tr className="bg-secondary/50 border-b border-border-subtle">
              {onSelectionChange && (
                <th className="px-4 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = someSelected;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-border-subtle bg-secondary text-accent focus:ring-accent focus:ring-offset-gray-900 cursor-pointer"
                  />
                </th>
              )}
              <th className={`px-4 py-4 text-[10px] font-black text-text-muted uppercase min-w-[280px] ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.name')}</th>
              {!hideActions && <th className="px-4 py-4 text-center text-[10px] font-black text-text-muted uppercase">{t('common.actions')}</th>}
              <th className={`px-4 py-4 text-[10px] font-black text-text-muted uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.status')}</th>
              <th className={`px-4 py-4 text-[10px] font-black text-text-muted uppercase ${isRTL ? 'text-left' : 'text-right'}`}>{t('manage.daily_budget')}</th>
              <th className={`px-4 py-4 text-[10px] font-black text-text-muted uppercase ${isRTL ? 'text-left' : 'text-right'}`}>
                <MetricTooltip tooltipKey="tooltips.spend">{t('metrics.spend')}</MetricTooltip>
              </th>
              <th className={`px-4 py-4 text-[10px] font-black text-text-muted uppercase ${isRTL ? 'text-left' : 'text-right'}`}>
                <MetricTooltip tooltipKey="tooltips.impressions">{t('metrics.impressions')}</MetricTooltip>
              </th>
              <th className={`px-4 py-4 text-[10px] font-black text-text-muted uppercase ${isRTL ? 'text-left' : 'text-right'}`}>
                <MetricTooltip tooltipKey="tooltips.clicks">{t('metrics.clicks')}</MetricTooltip>
              </th>
              <th className={`px-4 py-4 text-[10px] font-black text-text-muted uppercase ${isRTL ? 'text-left' : 'text-right'}`}>
                <MetricTooltip tooltipKey="tooltips.ctr">{t('metrics.ctr')}</MetricTooltip>
              </th>
              <th className={`px-4 py-4 text-[10px] font-black text-text-muted uppercase ${isRTL ? 'text-left' : 'text-right'}`}>
                <MetricTooltip tooltipKey="tooltips.cpc">{t('metrics.cpc')}</MetricTooltip>
              </th>
              <th className={`px-4 py-4 text-[10px] font-black text-text-muted uppercase ${isRTL ? 'text-left' : 'text-right'}`}>
                <MetricTooltip tooltipKey="tooltips.conversions">{t('metrics.conversions')}</MetricTooltip>
              </th>
              <th className={`px-4 py-4 text-[10px] font-black text-text-muted uppercase ${isRTL ? 'text-left' : 'text-right'}`}>
                <MetricTooltip tooltipKey="tooltips.cpa">{t('metrics.cpa')}</MetricTooltip>
              </th>
              <th className={`px-4 py-4 text-[10px] font-black text-text-muted uppercase ${isRTL ? 'text-left' : 'text-right'}`}>
                <MetricTooltip tooltipKey="tooltips.conversion_rate">{t('metrics.conversion_rate')}</MetricTooltip>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {isLoading ? (
              <tr>
                <td colSpan={onSelectionChange ? 13 : 12} className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-2" />
                  <span className="text-text-muted">{t('common.loading')}</span>
                </td>
              </tr>
            ) : filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={onSelectionChange ? 13 : 12} className="px-6 py-12 text-center text-text-muted">
                  {t('campaigns.no_data')}
                </td>
              </tr>
            ) : (
              filteredCampaigns.map(campaign => {
                const campaignBudgetInfo = campaignBudgets[String(campaign.campaign_id)];
                const isCbo = campaignBudgetInfo?.is_cbo ?? false;

                return (
                  <React.Fragment key={`campaign-${campaign.campaign_id}`}>
                    {/* Campaign Row */}
                    <tr className="hover:bg-row-hover">
                      {onSelectionChange && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedCampaignIds.includes(campaign.campaign_id)}
                            onChange={() => handleCheckboxToggle(campaign.campaign_id)}
                            className="w-4 h-4 rounded border-border-subtle bg-secondary text-accent focus:ring-accent focus:ring-offset-gray-900 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className={`px-4 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                          <button
                            onClick={() => handleCampaignExpand(campaign.campaign_id)}
                            className="p-1 hover:bg-white/10 rounded shrink-0"
                          >
                            {expandedCampaigns.has(campaign.campaign_id) ? (
                              <ChevronDown className="w-4 h-4 text-text-muted" />
                            ) : (
                              isRTL ? <ChevronLeft className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />
                            )}
                          </button>
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <div className="font-bold text-foreground">{campaign.campaign_name}</div>
                            <div className="text-[10px] text-text-muted font-mono">{campaign.campaign_id}</div>
                          </div>
                        </div>
                      </td>
                      {!hideActions && (
                        <td className="px-4 py-4 text-center">
                          {renderActionButton('campaign', campaign.campaign_id, campaign.campaign_name, campaign.campaign_status, campaign.spend)}
                        </td>
                      )}
                      <td className="px-4 py-4">{renderStatusBadge(campaign.campaign_status)}</td>
                      <td className={`px-4 py-4 text-foreground ${isRTL ? 'text-left' : 'text-right'}`}>
                        {renderBudgetCell('campaign', campaign.campaign_id, isCbo)}
                      </td>
                      <td className={`px-4 py-4 text-foreground font-bold ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(campaign.spend)}</td>
                      <td className={`px-4 py-4 text-foreground ${isRTL ? 'text-left' : 'text-right'}`}>{formatNumber(campaign.impressions)}</td>
                      <td className={`px-4 py-4 text-foreground ${isRTL ? 'text-left' : 'text-right'}`}>{formatNumber(campaign.clicks)}</td>
                      <td className={`px-4 py-4 text-foreground ${isRTL ? 'text-left' : 'text-right'}`}>{formatPercent(campaign.ctr)}</td>
                      <td className={`px-4 py-4 text-foreground ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrencyDecimal(campaign.cpc)}</td>
                      <td className={`px-4 py-4 text-foreground ${isRTL ? 'text-left' : 'text-right'}`}>{formatNumber(campaign.conversions)}</td>
                      <td className={`px-4 py-4 text-foreground ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrencyDecimal(campaign.cpa)}</td>
                      <td className={`px-4 py-4 text-foreground ${isRTL ? 'text-left' : 'text-right'}`}>{formatPercent(campaign.conv_rate)}</td>
                    </tr>

                    {/* Ad Sets (when expanded) */}
                    {expandedCampaigns.has(campaign.campaign_id) && (
                      <>
                        {loadingAdsets.has(campaign.campaign_id) ? (
                          <tr key={`loading-adsets-${campaign.campaign_id}`}>
                            <td colSpan={onSelectionChange ? 13 : 12} className="px-6 py-4 text-center bg-secondary/30">
                              <Loader2 className="w-5 h-5 text-text-muted animate-spin mx-auto" />
                            </td>
                          </tr>
                        ) : (
                          (adsets[campaign.campaign_id] || []).map(adset => (
                            <React.Fragment key={`adset-${adset.adset_id}`}>
                              {/* Ad Set Row */}
                              <tr className="bg-secondary/30 hover:bg-secondary/50">
                                {onSelectionChange && <td className="px-4 py-3"></td>}
                                <td className={`px-4 py-3 ${isRTL ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                                    <button
                                      onClick={() => handleAdsetExpand(adset.adset_id)}
                                      className="p-1 hover:bg-white/10 rounded shrink-0"
                                    >
                                      {expandedAdsets.has(adset.adset_id) ? (
                                        <ChevronDown className="w-4 h-4 text-text-disabled" />
                                      ) : (
                                        isRTL ? <ChevronLeft className="w-4 h-4 text-text-disabled" /> : <ChevronRight className="w-4 h-4 text-text-disabled" />
                                      )}
                                    </button>
                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                      <div className="text-foreground">{adset.adset_name}</div>
                                      <div className="text-[10px] text-text-disabled font-mono">{adset.adset_id}</div>
                                    </div>
                                  </div>
                                </td>
                                {!hideActions && (
                                  <td className="px-4 py-3 text-center">
                                    {renderActionButton('adset', adset.adset_id, adset.adset_name, adset.adset_status, adset.spend)}
                                  </td>
                                )}
                                <td className="px-4 py-3">{renderStatusBadge(adset.adset_status)}</td>
                                <td className={`px-4 py-3 text-text-muted ${isRTL ? 'text-left' : 'text-right'}`}>
                                  {renderBudgetCell('adset', adset.adset_id, isCbo)}
                                </td>
                                <td className={`px-4 py-3 text-foreground ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(adset.spend)}</td>
                                <td className={`px-4 py-3 text-text-muted ${isRTL ? 'text-left' : 'text-right'}`}>{formatNumber(adset.impressions)}</td>
                                <td className={`px-4 py-3 text-text-muted ${isRTL ? 'text-left' : 'text-right'}`}>{formatNumber(adset.clicks)}</td>
                                <td className={`px-4 py-3 text-text-muted ${isRTL ? 'text-left' : 'text-right'}`}>{formatPercent(adset.ctr)}</td>
                                <td className={`px-4 py-3 text-text-muted ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrencyDecimal(adset.cpc)}</td>
                                <td className={`px-4 py-3 text-text-muted ${isRTL ? 'text-left' : 'text-right'}`}>{formatNumber(adset.conversions)}</td>
                                <td className={`px-4 py-3 text-text-muted ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrencyDecimal(adset.cpa)}</td>
                                <td className={`px-4 py-3 text-text-muted ${isRTL ? 'text-left' : 'text-right'}`}>{formatPercent(adset.conv_rate)}</td>
                              </tr>

                              {/* Ads (when expanded) */}
                              {expandedAdsets.has(adset.adset_id) && (
                                <>
                                  {loadingAds.has(adset.adset_id) ? (
                                    <tr key={`loading-ads-${adset.adset_id}`}>
                                      <td colSpan={onSelectionChange ? 13 : 12} className="px-6 py-3 text-center bg-secondary/50">
                                        <Loader2 className="w-4 h-4 text-text-muted animate-spin mx-auto" />
                                      </td>
                                    </tr>
                                  ) : (
                                    (ads[adset.adset_id] || []).map(ad => (
                                      <tr key={`ad-${ad.ad_id}`} className="bg-secondary/50 hover:bg-secondary/70">
                                        {onSelectionChange && <td className="px-4 py-2"></td>}
                                        <td className={`px-4 py-2 ${isRTL ? 'pr-16' : 'pl-16'}`}>
                                          <div className={isRTL ? 'text-right' : 'text-left'}>
                                            <div className="text-foreground text-sm">{ad.ad_name}</div>
                                            <div className="text-[10px] text-text-disabled font-mono">{ad.ad_id}</div>
                                          </div>
                                        </td>
                                        {!hideActions && (
                                          <td className="px-4 py-2 text-center">
                                            {renderActionButton('ad', ad.ad_id, ad.ad_name, ad.ad_status, ad.spend)}
                                          </td>
                                        )}
                                        <td className="px-4 py-2">{renderStatusBadge(ad.ad_status)}</td>
                                        <td className={`px-4 py-2 text-text-muted text-sm ${isRTL ? 'text-left' : 'text-right'}`}>-</td>
                                        <td className={`px-4 py-2 text-text-muted text-sm ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(ad.spend)}</td>
                                        <td className={`px-4 py-2 text-text-muted text-sm ${isRTL ? 'text-left' : 'text-right'}`}>{formatNumber(ad.impressions)}</td>
                                        <td className={`px-4 py-2 text-text-muted text-sm ${isRTL ? 'text-left' : 'text-right'}`}>{formatNumber(ad.clicks)}</td>
                                        <td className={`px-4 py-2 text-text-muted text-sm ${isRTL ? 'text-left' : 'text-right'}`}>{formatPercent(ad.ctr)}</td>
                                        <td className={`px-4 py-2 text-text-muted text-sm ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrencyDecimal(ad.cpc)}</td>
                                        <td className={`px-4 py-2 text-text-muted text-sm ${isRTL ? 'text-left' : 'text-right'}`}>{formatNumber(ad.conversions)}</td>
                                        <td className={`px-4 py-2 text-text-muted text-sm ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrencyDecimal(ad.cpa)}</td>
                                        <td className={`px-4 py-2 text-text-muted text-sm ${isRTL ? 'text-left' : 'text-right'}`}>{formatPercent(ad.conv_rate)}</td>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Status Confirmation Modal */}
      {statusModal && (
        <StatusConfirmModal
          isOpen={statusModal.isOpen}
          onClose={() => setStatusModal(null)}
          onConfirm={handleStatusConfirm}
          isLoading={updatingId !== null}
          type={statusModal.type}
          name={statusModal.name}
          currentStatus={statusModal.currentStatus}
          dailySpend={statusModal.dailySpend}
          currency={currency}
        />
      )}
    </div>
  );
}
