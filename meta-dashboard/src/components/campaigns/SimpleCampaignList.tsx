"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@tremor/react';
import { Loader2, Power, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchCampaignsWithComparison } from '@/services/campaigns.service';
import { mutationsService, BudgetInfo } from '@/services/mutations.service';
import { useAccount } from '@/context/AccountContext';
import { CampaignRow } from '@/types/campaigns.types';
import { fetchMetricTrends } from '@/services/dashboard.service';

interface SimpleCampaignListProps {
  startDate: string | null;
  endDate: string | null;
}

type GraphPeriod = 'day' | 'week' | 'month';
type GraphMetric = 'spend' | 'clicks' | 'conversions' | 'cpa';

const SimpleCampaignList: React.FC<SimpleCampaignListProps> = ({ startDate, endDate }) => {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar' || locale === 'he';
  const queryClient = useQueryClient();
  const { selectedAccountId, linkedAccounts } = useAccount();
  const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);
  const currency = selectedAccount?.currency || 'USD';

  // State
  const [updatingCampaignId, setUpdatingCampaignId] = useState<string | null>(null);
  const [campaignBudgets, setCampaignBudgets] = useState<Record<string, BudgetInfo>>({});
  const [editingBudget, setEditingBudget] = useState<{ id: string; value: string } | null>(null);
  const [savingBudget, setSavingBudget] = useState(false);
  const [graphPeriod, setGraphPeriod] = useState<GraphPeriod>('week');
  const [graphMetric, setGraphMetric] = useState<GraphMetric>('spend');

  // Fetch campaigns
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['simple-campaigns', startDate, endDate, selectedAccountId],
    queryFn: () => fetchCampaignsWithComparison(
      { startDate: startDate || '', endDate: endDate || '' },
      [],
      '',
      'spend',
      'desc',
      selectedAccountId
    ),
    enabled: !!startDate && !!endDate && !!selectedAccountId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch daily metrics for graph
  const { data: dailyMetrics } = useQuery({
    queryKey: ['daily-metrics', startDate, endDate, selectedAccountId],
    queryFn: () => fetchMetricTrends(`${startDate}:${endDate}`, 'day', selectedAccountId),
    enabled: !!startDate && !!endDate && !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch budgets when campaigns load
  useEffect(() => {
    if (campaigns && campaigns.length > 0) {
      const campaignIds = campaigns.map((c: CampaignRow) => String(c.campaign_id));
      mutationsService.getCampaignBudgets(campaignIds)
        .then(budgets => setCampaignBudgets(budgets))
        .catch(err => console.error('Failed to fetch budgets:', err));
    }
  }, [campaigns]);

  // Status toggle mutation
  const statusMutation = useMutation({
    mutationFn: async ({ campaignId, newStatus }: { campaignId: string; newStatus: 'ACTIVE' | 'PAUSED' }) => {
      return mutationsService.updateCampaignStatus(campaignId, newStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simple-campaigns'] });
    },
  });

  const handleToggleStatus = async (campaign: CampaignRow) => {
    const newStatus = campaign.campaign_status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setUpdatingCampaignId(String(campaign.campaign_id));
    try {
      await statusMutation.mutateAsync({ campaignId: String(campaign.campaign_id), newStatus });
    } finally {
      setUpdatingCampaignId(null);
    }
  };

  // Budget save handler
  const handleBudgetSave = async () => {
    if (!editingBudget) return;

    const budgetValue = parseFloat(editingBudget.value);
    if (isNaN(budgetValue) || budgetValue <= 0) {
      alert(t('manage.invalid_budget') || 'Invalid budget value');
      return;
    }

    const budgetCents = Math.round(budgetValue * 100);
    setSavingBudget(true);

    try {
      await mutationsService.updateCampaignBudget(editingBudget.id, budgetCents);
      setCampaignBudgets(prev => ({
        ...prev,
        [editingBudget.id]: { ...prev[editingBudget.id], daily_budget_cents: budgetCents }
      }));
      setEditingBudget(null);
    } catch (error) {
      console.error('Failed to update budget:', error);
      alert(t('errors.failed_to_update') || 'Failed to update budget');
    } finally {
      setSavingBudget(false);
    }
  };

  // Format helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatBudget = (cents: number | null | undefined): string => {
    if (cents === null || cents === undefined) return '-';
    return formatCurrency(cents / 100);
  };

  // Aggregate daily metrics for graph based on period and metric
  const getGraphData = () => {
    if (!dailyMetrics || !Array.isArray(dailyMetrics)) return [];

    if (graphPeriod === 'day') {
      return dailyMetrics.map((d: any) => {
        const spend = d.spend || 0;
        const clicks = d.clicks || 0;
        const conversions = d.conversions || 0;
        const cpa = conversions > 0 ? spend / conversions : 0;
        return {
          date: new Date(d.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
          value: graphMetric === 'spend' ? spend : graphMetric === 'clicks' ? clicks : graphMetric === 'conversions' ? conversions : cpa,
        };
      });
    }

    // Aggregate by week or month
    const aggregated: Record<string, { spend: number; clicks: number; conversions: number; count: number }> = {};

    dailyMetrics.forEach((d: any) => {
      const date = new Date(d.date);
      let key: string;

      if (graphPeriod === 'week') {
        // Get week start (Sunday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      } else {
        // Month
        key = date.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
      }

      if (!aggregated[key]) {
        aggregated[key] = { spend: 0, clicks: 0, conversions: 0, count: 0 };
      }
      aggregated[key].spend += d.spend || 0;
      aggregated[key].clicks += d.clicks || 0;
      aggregated[key].conversions += d.conversions || 0;
      aggregated[key].count += 1;
    });

    return Object.entries(aggregated).map(([date, data]) => {
      const cpa = data.conversions > 0 ? data.spend / data.conversions : 0;
      return {
        date,
        value: graphMetric === 'spend' ? data.spend : graphMetric === 'clicks' ? data.clicks : graphMetric === 'conversions' ? data.conversions : cpa,
      };
    });
  };

  // Format value for chart based on metric type
  const formatChartValue = (value: number): string => {
    if (graphMetric === 'spend' || graphMetric === 'cpa') {
      return formatCurrency(value);
    }
    return value.toLocaleString(locale);
  };

  // Get metric label
  const getMetricLabel = (): string => {
    switch (graphMetric) {
      case 'spend': return t('metrics.spend') || 'Spend';
      case 'clicks': return t('metrics.clicks') || 'Clicks';
      case 'conversions': return t('metrics.conversions') || 'Conversions';
      case 'cpa': return t('metrics.cpa') || 'CPA';
      default: return '';
    }
  };

  // Calculate totals
  const totals = campaigns?.reduce(
    (acc, c) => ({
      spend: acc.spend + (c.spend || 0),
      conversions: acc.conversions + (c.conversions || 0),
    }),
    { spend: 0, conversions: 0 }
  ) || { spend: 0, conversions: 0 };

  const avgCpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;

  if (isLoading) {
    return (
      <Card className="card-gradient border-border-subtle">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      </Card>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card className="card-gradient border-border-subtle">
        <div className="p-6 text-center">
          <p className="text-gray-400 text-sm">{t('campaigns2.no_campaigns')}</p>
        </div>
      </Card>
    );
  }

  const graphData = getGraphData();

  return (
    <div className="space-y-6">
      {/* Campaign Table Card */}
      <Card className="card-gradient border-border-subtle overflow-hidden">
        {/* Table Header - New order: Name | Status | Budget | Spend | Conversions | CPA */}
        <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider" dir={isRTL ? 'rtl' : 'ltr'}>
          <div>{t('campaigns2.name')}</div>
          <div className="text-center">{t('campaigns2.status')}</div>
          <div className={isRTL ? 'text-left' : 'text-right'}>{t('manage.daily_budget') || 'Budget'}</div>
          <div className={isRTL ? 'text-left' : 'text-right'}>{t('campaigns2.spend')}</div>
          <div className={isRTL ? 'text-left' : 'text-right'}>{t('campaigns2.conversions')}</div>
          <div className={isRTL ? 'text-left' : 'text-right'}>{t('campaigns2.cpa')}</div>
        </div>

        {/* Campaign Rows */}
        <div className="divide-y divide-white/5">
          {campaigns.map((campaign) => {
            const isActive = campaign.campaign_status === 'ACTIVE';
            const isUpdating = updatingCampaignId === String(campaign.campaign_id);
            const cpa = campaign.conversions > 0 ? campaign.spend / campaign.conversions : null;
            const budgetInfo = campaignBudgets[String(campaign.campaign_id)];
            const budgetCents = budgetInfo?.daily_budget_cents;
            const isEditingThis = editingBudget?.id === String(campaign.campaign_id);

            return (
              <div
                key={campaign.campaign_id}
                className="grid grid-cols-6 gap-4 px-4 py-3 items-center hover:bg-white/5 transition-colors"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {/* Name */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{campaign.campaign_name}</p>
                </div>

                {/* Status Toggle */}
                <div className="flex justify-center">
                  <button
                    onClick={() => handleToggleStatus(campaign)}
                    disabled={isUpdating}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                    }`}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Power className="w-3 h-3" />
                    )}
                    <span>{isActive ? t('campaigns2.on') : t('campaigns2.off')}</span>
                  </button>
                </div>

                {/* Budget - Editable */}
                <div className={`flex items-center justify-end gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {isEditingThis ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="1"
                        min="1"
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
                  ) : (
                    <div className="flex items-center gap-1 group">
                      <span className="text-sm text-white">{formatBudget(budgetCents)}</span>
                      {budgetCents !== null && budgetCents !== undefined && (
                        <button
                          onClick={() => setEditingBudget({ id: String(campaign.campaign_id), value: String(budgetCents / 100) })}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-opacity"
                        >
                          <Pencil className="w-3 h-3 text-gray-400" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Spend */}
                <div className={isRTL ? 'text-left' : 'text-right'}>
                  <p className="text-sm text-white">{formatCurrency(campaign.spend || 0)}</p>
                </div>

                {/* Conversions */}
                <div className={isRTL ? 'text-left' : 'text-right'}>
                  <p className="text-sm text-white">{campaign.conversions || 0}</p>
                </div>

                {/* CPA */}
                <div className={isRTL ? 'text-left' : 'text-right'}>
                  <p className="text-sm text-white">{cpa ? formatCurrency(cpa) : '-'}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals Row */}
        <div className="grid grid-cols-6 gap-4 px-4 py-3 border-t border-white/10 bg-white/5" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="text-sm font-semibold text-white">{t('campaigns2.total')}</div>
          <div></div>
          <div></div>
          <div className={`text-sm font-semibold text-white ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(totals.spend)}</div>
          <div className={`text-sm font-semibold text-white ${isRTL ? 'text-left' : 'text-right'}`}>{totals.conversions}</div>
          <div className={`text-sm font-semibold text-white ${isRTL ? 'text-left' : 'text-right'}`}>{avgCpa > 0 ? formatCurrency(avgCpa) : '-'}</div>
        </div>

        {/* See Detailed View Link */}
        <a
          href={`/${locale}/campaign-control`}
          className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-accent hover:text-accent-hover transition-colors border-t border-white/10"
        >
          {t('campaigns2.see_detailed') || 'See more details'}
          <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        </a>
      </Card>

      {/* Performance by Time Section */}
      {graphData.length > 0 && (
        <>
          {/* Section Title */}
          <h2 className="text-lg font-semibold text-white" dir={isRTL ? 'rtl' : 'ltr'}>
            {t('campaigns2.performance_by_time') || 'Performance by Time'}
          </h2>

          {/* Performance Graph Card */}
          <Card className="card-gradient border-border-subtle overflow-hidden p-4">
            {/* Controls Row: Period Toggle + Metric Selector */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              {/* Period Toggle */}
              <div className="flex gap-1">
                {(['day', 'week', 'month'] as GraphPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setGraphPeriod(period)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      graphPeriod === period
                        ? 'bg-accent text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {t(`date.${period}`) || period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>

              {/* Metric Selector */}
              <div className="flex gap-1">
                {(['spend', 'clicks', 'conversions', 'cpa'] as GraphMetric[]).map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setGraphMetric(metric)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      graphMetric === metric
                        ? 'bg-accent text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {metric === 'spend' ? t('metrics.spend') || 'Spend' :
                     metric === 'clicks' ? t('metrics.clicks') || 'Clicks' :
                     metric === 'conversions' ? t('metrics.conversions') || 'Conversions' :
                     t('metrics.cpa') || 'CPA'}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#475569"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => graphMetric === 'spend' || graphMetric === 'cpa' ? `$${value.toLocaleString()}` : value.toLocaleString()}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                    formatter={(value: number) => [formatChartValue(value), getMetricLabel()]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default SimpleCampaignList;
