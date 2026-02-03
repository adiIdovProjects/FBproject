"use client";

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@tremor/react';
import { Loader2, Power, ChevronRight } from 'lucide-react';
import Link from 'next/navigation';
import { fetchCampaignsWithComparison } from '@/services/campaigns.service';
import { mutationsService } from '@/services/mutations.service';
import { useAccount } from '@/context/AccountContext';
import { formatDate, calculateDateRange } from '@/utils/date';
import { CampaignRow } from '@/types/campaigns.types';

type DateRangeType = 'last_7_days' | 'last_14_days' | 'last_30_days';

interface SimpleCampaignListProps {
  dateRange?: DateRangeType;
}

const SimpleCampaignList: React.FC<SimpleCampaignListProps> = ({ dateRange = 'last_7_days' }) => {
  const t = useTranslations();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAccount();
  const [updatingCampaignId, setUpdatingCampaignId] = useState<string | null>(null);

  // Calculate date range
  const range = calculateDateRange(dateRange);
  const startDate = formatDate(range.start) || '';
  const endDate = formatDate(range.end) || '';

  // Fetch campaigns
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['simple-campaigns', startDate, endDate, selectedAccountId],
    queryFn: () => fetchCampaignsWithComparison(
      { startDate, endDate },
      [], // no status filter
      '',
      'spend',
      'desc',
      selectedAccountId
    ),
    enabled: !!startDate && !!endDate && !!selectedAccountId,
    staleTime: 2 * 60 * 1000,
  });

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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

  return (
    <Card className="card-gradient border-border-subtle overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        <div>{t('campaigns2.name')}</div>
        <div className="text-right">{t('campaigns2.spend')}</div>
        <div className="text-right">{t('campaigns2.conversions')}</div>
        <div className="text-right">{t('campaigns2.cpa')}</div>
        <div className="text-center">{t('campaigns2.status')}</div>
      </div>

      {/* Campaign Rows */}
      <div className="divide-y divide-white/5">
        {campaigns.map((campaign) => {
          const isActive = campaign.campaign_status === 'ACTIVE';
          const isUpdating = updatingCampaignId === String(campaign.campaign_id);
          const cpa = campaign.conversions > 0 ? campaign.spend / campaign.conversions : null;

          return (
            <div
              key={campaign.campaign_id}
              className="grid grid-cols-5 gap-4 px-4 py-3 items-center hover:bg-white/5 transition-colors"
            >
              {/* Name */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{campaign.campaign_name}</p>
              </div>

              {/* Spend */}
              <div className="text-right">
                <p className="text-sm text-white">{formatCurrency(campaign.spend || 0)}</p>
              </div>

              {/* Conversions */}
              <div className="text-right">
                <p className="text-sm text-white">{campaign.conversions || 0}</p>
              </div>

              {/* CPA */}
              <div className="text-right">
                <p className="text-sm text-white">{cpa ? formatCurrency(cpa) : '-'}</p>
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
            </div>
          );
        })}
      </div>

      {/* Totals Row */}
      <div className="grid grid-cols-5 gap-4 px-4 py-3 border-t border-white/10 bg-white/5">
        <div className="text-sm font-semibold text-white">{t('campaigns2.total')}</div>
        <div className="text-right text-sm font-semibold text-white">{formatCurrency(totals.spend)}</div>
        <div className="text-right text-sm font-semibold text-white">{totals.conversions}</div>
        <div className="text-right text-sm font-semibold text-white">{avgCpa > 0 ? formatCurrency(avgCpa) : '-'}</div>
        <div></div>
      </div>

      {/* See Detailed View Link */}
      <a
        href={`/${locale}/campaign-control`}
        className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-accent hover:text-accent-hover transition-colors border-t border-white/10"
      >
        {t('campaigns2.see_detailed')}
        <ChevronRight className="w-4 h-4" />
      </a>
    </Card>
  );
};

export default SimpleCampaignList;
