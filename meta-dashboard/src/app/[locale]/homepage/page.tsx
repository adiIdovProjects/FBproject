"use client";

/**
 * Homepage - AI-first experience for freelancers and SMBs
 * Simple, guided interface with Eddie the ads captain
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '../../../components/MainLayout';
import { useAccount } from '../../../context/AccountContext';
import { AIChat } from '../../../components/insights/AIChat';

// New components
import AccountStatusHero from '../../../components/homepage/AccountStatusHero';
import HomeAIAssistant from '../../../components/homepage/HomeAIAssistant';
import WhatsHappening from '../../../components/homepage/WhatsHappening';
import GuidedActions from '../../../components/homepage/GuidedActions';
import CapabilitiesShowcase from '../../../components/homepage/CapabilitiesShowcase';

// Services for health calculation
import { fetchCampaignsWithComparison } from '../../../services/campaigns.service';
import { formatDate, calculateDateRange } from '../../../utils/date';
import { CampaignRow } from '../../../types/campaigns.types';

// Health calculation
function getCampaignHealthStatus(campaign: CampaignRow): 'great' | 'attention' | 'problem' {
  if (campaign.spend === 0) return 'great';
  if (campaign.spend > 50 && campaign.conversions === 0 && campaign.clicks < 10) return 'problem';
  if (campaign.conversions > 0) return 'great';
  if (campaign.ctr > 1) return 'great';
  if (campaign.ctr < 1 && campaign.impressions > 1000) return 'attention';
  return 'attention';
}

type AccountHealth = 'good' | 'attention' | 'issues' | 'new_user' | 'loading';

function calculateAccountHealth(campaigns: CampaignRow[] | undefined, isLoading: boolean): AccountHealth {
  if (isLoading) return 'loading';
  if (!campaigns || campaigns.length === 0) return 'new_user';

  const activeCampaigns = campaigns.filter(c => c.campaign_status === 'ACTIVE');
  if (activeCampaigns.length === 0) return 'good';

  const healthResults = activeCampaigns.map(getCampaignHealthStatus);
  const problems = healthResults.filter(h => h === 'problem').length;
  const attention = healthResults.filter(h => h === 'attention').length;

  if (problems > 0) return 'issues';
  if (attention >= 2) return 'attention';
  return 'good';
}

export default function Homepage() {
  const t = useTranslations();
  const { selectedAccountId } = useAccount();

  // AI Chat modal state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialChatMessage, setInitialChatMessage] = useState<string | undefined>();

  // Fetch campaigns for health calculation (shared across components)
  const dateRange = useMemo(() => calculateDateRange('last_30_days'), []);
  const startDate = formatDate(dateRange.start) || '';
  const endDate = formatDate(dateRange.end) || '';

  const { data: campaigns, isLoading: isCampaignsLoading } = useQuery({
    queryKey: ['homepage-health-campaigns', startDate, endDate, selectedAccountId],
    queryFn: () => fetchCampaignsWithComparison(
      { startDate, endDate },
      [],
      '',
      'spend',
      'desc',
      selectedAccountId
    ),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate account health
  const accountHealth = calculateAccountHealth(campaigns, isCampaignsLoading);

  // Find problem campaign name for GuidedActions
  const problemCampaign = campaigns?.find(c => getCampaignHealthStatus(c) === 'problem');
  const problemCampaignName = problemCampaign?.campaign_name;

  // Check if user has issues
  const hasIssues = accountHealth === 'issues' || accountHealth === 'attention';
  const hasActiveCampaigns = accountHealth !== 'new_user';

  // Handle opening chat with optional initial message
  const handleOpenChat = (message?: string) => {
    setInitialChatMessage(message);
    setIsChatOpen(true);
  };

  return (
    <MainLayout
      title={t('homepage.title')}
      description={t('homepage.subtitle')}
    >
      {/* Section 1: Account Status Hero */}
      <AccountStatusHero accountId={selectedAccountId} />

      {/* Section 2: AI Assistant (Eddie) */}
      <div className="mt-6">
        <HomeAIAssistant
          onOpenChat={handleOpenChat}
          hasActiveCampaigns={hasActiveCampaigns}
          hasIssues={hasIssues}
        />
      </div>

      {/* Section 3: What's Happening + Guided Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <WhatsHappening accountId={selectedAccountId} />
        </div>
        <div>
          <GuidedActions
            accountHealth={accountHealth}
            onOpenChat={() => handleOpenChat()}
            problemCampaignName={problemCampaignName}
          />
        </div>
      </div>

      {/* Section 4: Capabilities Showcase */}
      <div className="mt-6">
        <CapabilitiesShowcase />
      </div>

      {/* AI Chat Modal */}
      <AIChat
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setInitialChatMessage(undefined);
        }}
        accountId={selectedAccountId || undefined}
        initialQuery={initialChatMessage}
      />
    </MainLayout>
  );
}
