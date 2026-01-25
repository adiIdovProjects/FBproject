"use client";

/**
 * Homepage - Beginner-friendly mission control
 * Simple overview with quick stats, campaigns, actions, and recommendations
 */

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MainLayout } from '../../../components/MainLayout';
import { useAccount } from '../../../context/AccountContext';
import QuickStats from '../../../components/homepage/QuickStats';
import SimpleCampaignList from '../../../components/homepage/SimpleCampaignList';
import TopCreatives from '../../../components/homepage/TopCreatives';
import ActionPanel from '../../../components/homepage/ActionPanel';
import SimpleRecommendations from '../../../components/homepage/SimpleRecommendations';
import { AIChat } from '../../../components/insights/AIChat';

export default function Homepage() {
  const t = useTranslations();
  const locale = useLocale();
  const { selectedAccountId } = useAccount();

  // AI Chat modal state
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <MainLayout
      title={t('homepage.title')}
      description={t('homepage.subtitle')}
    >
      {/* Quick Stats - Top row */}
      <QuickStats accountId={selectedAccountId} />

      {/* Main content - Campaigns + Actions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Campaigns List + Top Creatives - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <SimpleCampaignList accountId={selectedAccountId} />
          <TopCreatives accountId={selectedAccountId} />
        </div>

        {/* Action Panel + Recommendations - Right sidebar */}
        <div className="space-y-6">
          <ActionPanel onOpenChat={() => setIsChatOpen(true)} />
          <SimpleRecommendations accountId={selectedAccountId} />
        </div>
      </div>

      {/* AI Chat Modal */}
      <AIChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        accountId={selectedAccountId || undefined}
      />
    </MainLayout>
  );
}
