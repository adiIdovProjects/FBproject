"use client";

/**
 * Manage Page - Campaign Hierarchy with Full Metrics
 * Shows Campaign -> Ad Set -> Ad hierarchy with expandable rows
 * Also includes Create/Edit functionality (combined with uploader)
 */

import { useState, useMemo, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Info, Eye, PlusCircle, Layers, ArrowRight, Pencil, Copy, Loader2, Sparkles, Target, Settings, BarChart3, Lightbulb, MessageSquare } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import DateFilter from '../../../components/DateFilter';
import { AIHelpPanel } from '../../../components/campaigns/AIHelpPanel';
import CampaignControlTable from '../../../components/campaigns/CampaignControlTable';
import AnalysisTab from '../../../components/campaigns/AnalysisTab';
import RecommendationsTab from '../../../components/campaigns/RecommendationsTab';
import AIChatTab from '../../../components/campaigns/AIChatTab';

import { useAccount } from '../../../context/AccountContext';
import { mutationsService } from '@/services/mutations.service';

// Utilities
import { formatDate, calculateDateRange } from '../../../utils/date';

// Types for Create/Edit tab
interface Campaign {
  id: string;
  name: string;
  status: string;
}

type SelectedPath = null | 'create' | 'add' | 'edit';
type CreateSubOption = null | 'fresh' | 'duplicate';
type EditSubOption = null | 'adset' | 'ad';

const DEFAULT_DATE_RANGE_KEY = 'last_30_days';

export default function ManagePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRTL = locale === 'ar' || locale === 'he';
  const { selectedAccountId, linkedAccounts } = useAccount();
  const selectedAccount = linkedAccounts.find(a => a.account_id === selectedAccountId);
  const currency = selectedAccount?.currency || 'USD';

  // Tab state - check URL param for initial tab
  const [activeTab, setActiveTab] = useState<'view' | 'create' | 'analysis' | 'recommendations' | 'ai-chat'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'create') return 'create';
    if (tabParam === 'analysis') return 'analysis';
    if (tabParam === 'recommendations') return 'recommendations';
    if (tabParam === 'ai-chat') return 'ai-chat';
    return 'view';
  });

  // Initialize date range
  const initialDates = useMemo(() => calculateDateRange(DEFAULT_DATE_RANGE_KEY), []);
  const [startDate, setStartDate] = useState<string | null>(formatDate(initialDates.start));
  const [endDate, setEndDate] = useState<string | null>(formatDate(initialDates.end));

  // Create/Edit tab state
  const [selectedPath, setSelectedPath] = useState<SelectedPath>(null);
  const [createSubOption, setCreateSubOption] = useState<CreateSubOption>(null);
  const [editSubOption, setEditSubOption] = useState<EditSubOption>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [adSets, setAdSets] = useState<any[]>([]);
  const [isLoadingAdSets, setIsLoadingAdSets] = useState(false);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string>('');

  // Load campaigns when needed
  useEffect(() => {
    if ((createSubOption === 'duplicate' || selectedPath === 'add') && selectedAccount) {
      loadCampaigns();
    }
  }, [createSubOption, selectedPath, selectedAccount]);

  // Load adsets when campaign is selected
  useEffect(() => {
    if (selectedPath === 'add' && selectedCampaignId) {
      loadAdSets();
    } else {
      setAdSets([]);
      setSelectedAdSetId('');
    }
  }, [selectedCampaignId, selectedPath]);

  const loadCampaigns = async () => {
    if (!selectedAccount) return;
    setIsLoadingCampaigns(true);
    try {
      const result = await mutationsService.getCampaignsList(selectedAccount.account_id);
      setCampaigns(result);
    } catch (e) {
      console.error('Failed to load campaigns:', e);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const loadAdSets = async () => {
    if (!selectedCampaignId) return;
    setIsLoadingAdSets(true);
    try {
      const result = await mutationsService.getAdSetsList(selectedCampaignId);
      setAdSets(result);
    } catch (e) {
      console.error('Failed to load ad sets:', e);
    } finally {
      setIsLoadingAdSets(false);
    }
  };

  const handleContinue = () => {
    if (selectedPath === 'create') {
      if (createSubOption === 'fresh') {
        router.push(`/${locale}/uploader/wizard`);
      } else if (createSubOption === 'duplicate' && selectedCampaignId) {
        router.push(`/${locale}/uploader/wizard?clone=${selectedCampaignId}`);
      }
    } else if (selectedPath === 'add' && selectedCampaignId && selectedAdSetId) {
      router.push(`/${locale}/uploader/add-creative?campaign=${selectedCampaignId}&adset=${selectedAdSetId}`);
    } else if (selectedPath === 'edit') {
      router.push(`/${locale}/uploader/edit`);
    }
  };

  const canContinue = () => {
    if (selectedPath === 'create') {
      if (createSubOption === 'fresh') return true;
      if (createSubOption === 'duplicate') return !!selectedCampaignId;
      return false;
    }
    if (selectedPath === 'add') return !!(selectedCampaignId && selectedAdSetId);
    if (selectedPath === 'edit') return true;
    return false;
  };

  // Handle date range change from DateFilter
  const handleDateRangeChange = (newStart: string | null, newEnd: string | null) => {
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  return (
    <MainLayout
      title={t('nav.campaign_control')}
      description={t('manage.subtitle')}
    >
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <button
          onClick={() => setActiveTab('view')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'view'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          {t('campaign_control.tab_view') || 'View & Control'}
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'create'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          {t('campaign_control.tab_create') || 'Create / Edit'}
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'analysis'
              ? 'bg-green-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          {t('campaign_control.tab_analysis') || 'Analysis'}
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'recommendations'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          {t('campaign_control.tab_recommendations') || 'Recommendations'}
        </button>
        <button
          onClick={() => setActiveTab('ai-chat')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'ai-chat'
              ? 'bg-cyan-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {t('campaign_control.tab_ai_chat') || 'Ask AI'}
        </button>
      </div>

      {/* View & Control Tab */}
      {activeTab === 'view' && (
        <>
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
            <DateFilter
              startDate={startDate}
              endDate={endDate}
              onDateRangeChange={handleDateRangeChange}
              lang={locale as any}
              t={t}
              isRTL={isRTL}
            />
          </div>

          {/* Quick Guide */}
          <div
            className="flex items-start gap-3 p-4 mb-6 bg-blue-500/5 border border-blue-500/20 rounded-xl"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-gray-300">
              {t('manage.hierarchy_guide')}
            </div>
          </div>

          {/* AI Help Panel */}
          <AIHelpPanel accountId={selectedAccountId} />

          {/* Campaign Control Table */}
          <CampaignControlTable
            accountId={selectedAccountId}
            currency={currency}
            locale={locale}
            startDate={startDate || ''}
            endDate={endDate || ''}
          />
        </>
      )}

      {/* Create / Edit Tab */}
      {activeTab === 'create' && (
        <div className="max-w-4xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* AI Assistant Card - Prominent */}
          <div
            onClick={() => router.push(`/${locale}/uploader/ai-captain`)}
            className="mb-8 p-8 bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-amber-600/20 border-2 border-amber-500/50 rounded-2xl cursor-pointer hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg group-hover:scale-105 transition-transform">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    {t('captain.try_ai_captain') || 'Build with AI Assistant'}
                    <span className="text-xs bg-amber-500 text-white px-3 py-1 rounded-full font-medium">
                      {t('common.recommended') || 'Recommended'}
                    </span>
                  </h2>
                  <p className="text-amber-200/80 text-lg mt-1">
                    {t('captain.ai_description') || 'Step by step with recommendations'}
                  </p>
                </div>
              </div>
              <ArrowRight className={`w-8 h-8 text-amber-400 group-hover:translate-x-2 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-2' : ''}`} />
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-gray-500 text-sm">{t('uploader.build_manually') || 'or build manually'}</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          {/* Main Options */}
          <div className="space-y-4">
            {/* Option 1: Create New Campaign */}
            <div
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedPath === 'create'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
              }`}
              onClick={() => {
                setSelectedPath('create');
                setEditSubOption(null);
              }}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full shrink-0 ${
                  selectedPath === 'create' ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div className="flex-grow">
                  <h2 className="text-xl font-bold text-white mb-1">
                    {t('uploader.create_campaign_title')}
                  </h2>
                  <p className="text-gray-400 text-sm mb-1">
                    {t('uploader.create_when') || 'Choose this when you want a new objective or new targeting'}
                  </p>
                  <p className="text-blue-400 text-xs">
                    {t('uploader.create_examples') || 'Examples: New product launch, testing a different audience, new marketing goal'}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-1 ${
                  selectedPath === 'create' ? 'border-blue-500 bg-blue-500' : 'border-gray-500'
                }`}>
                  {selectedPath === 'create' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-options for Create */}
              {selectedPath === 'create' && (
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                  <p className="text-sm text-gray-300 font-medium">
                    {t('uploader.how_to_start') || 'How would you like to start?'}
                  </p>

                  {/* Start Fresh */}
                  <div
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      createSubOption === 'fresh'
                        ? 'border-blue-400 bg-blue-500/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={(e) => { e.stopPropagation(); setCreateSubOption('fresh'); }}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      <div className="flex-grow">
                        <p className="font-medium text-white">
                          {t('uploader.start_fresh') || 'Start Fresh'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {t('uploader.start_fresh_desc') || 'Create a brand new campaign from scratch'}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        createSubOption === 'fresh' ? 'border-blue-400 bg-blue-400' : 'border-gray-500'
                      }`} />
                    </div>
                  </div>

                  {/* Duplicate Existing */}
                  <div
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      createSubOption === 'duplicate'
                        ? 'border-blue-400 bg-blue-500/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={(e) => { e.stopPropagation(); setCreateSubOption('duplicate'); }}
                  >
                    <div className="flex items-center gap-3">
                      <Copy className="w-5 h-5 text-blue-400" />
                      <div className="flex-grow">
                        <p className="font-medium text-white">
                          {t('uploader.duplicate_existing') || 'Duplicate Existing Campaign'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {t('uploader.duplicate_existing_desc') || 'Start with settings from a campaign that worked well'}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        createSubOption === 'duplicate' ? 'border-blue-400 bg-blue-400' : 'border-gray-500'
                      }`} />
                    </div>

                    {/* Campaign selector */}
                    {createSubOption === 'duplicate' && (
                      <div className="mt-3 pt-3 border-t border-gray-600" onClick={(e) => e.stopPropagation()}>
                        {isLoadingCampaigns ? (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('common.loading')}
                          </div>
                        ) : campaigns.length === 0 ? (
                          <p className="text-sm text-yellow-400">
                            {t('uploader.no_campaigns_found')}
                          </p>
                        ) : (
                          <select
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none"
                          >
                            <option value="">{t('uploader.select_campaign')}</option>
                            {campaigns.map((campaign) => (
                              <option key={campaign.id} value={campaign.id}>
                                {campaign.name} ({campaign.status})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Option 2: Add Ad to Existing */}
            <div
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedPath === 'add'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
              }`}
              onClick={() => {
                setSelectedPath('add');
                setCreateSubOption(null);
                setEditSubOption(null);
              }}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full shrink-0 ${
                  selectedPath === 'add' ? 'bg-purple-500 text-white' : 'bg-purple-500/10 text-purple-400'
                }`}>
                  <Layers className="w-6 h-6" />
                </div>
                <div className="flex-grow">
                  <h2 className="text-xl font-bold text-white mb-1">
                    {t('uploader.add_creative_title')}
                  </h2>
                  <p className="text-gray-400 text-sm mb-1">
                    {t('uploader.add_when') || 'Choose this when you want to test new creatives with the same targeting'}
                  </p>
                  <p className="text-purple-400 text-xs">
                    {t('uploader.add_examples') || 'Great for A/B testing: same audience, different images or text'}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-1 ${
                  selectedPath === 'add' ? 'border-purple-500 bg-purple-500' : 'border-gray-500'
                }`}>
                  {selectedPath === 'add' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Add Creative Sub-Options */}
            {selectedPath === 'add' && (
              <div className={`${isRTL ? 'mr-6' : 'ml-6'} p-5 bg-purple-500/5 rounded-xl border-2 border-purple-500/30 space-y-4`}>
                <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {t('uploader.select_campaign_adset') || 'Select Campaign & Ad Set'}
                </h3>

                {/* Campaign Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    {t('uploader.select_campaign') || 'Select Campaign'}
                  </label>
                  {isLoadingCampaigns ? (
                    <div className="flex items-center gap-2 text-sm text-purple-400 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('common.loading') || 'Loading...'}
                    </div>
                  ) : campaigns.length > 0 ? (
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="">{t('uploader.select_campaign') || 'Select a campaign...'}</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name} ({campaign.status})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-yellow-400">
                      {t('uploader.no_campaigns_found') || 'No campaigns found'}
                    </p>
                  )}
                </div>

                {/* Ad Set Selection */}
                {selectedCampaignId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      {t('uploader.select_adset') || 'Select Ad Set'}
                    </label>
                    {isLoadingAdSets ? (
                      <div className="flex items-center gap-2 text-sm text-purple-400 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('common.loading') || 'Loading...'}
                      </div>
                    ) : adSets.length > 0 ? (
                      <select
                        value={selectedAdSetId}
                        onChange={(e) => setSelectedAdSetId(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      >
                        <option value="">{t('uploader.select_adset') || 'Select an ad set...'}</option>
                        {adSets.map((adSet: any) => (
                          <option key={adSet.id} value={adSet.id}>
                            {adSet.name} ({adSet.status})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-yellow-400">
                        {t('uploader.no_adsets_found') || 'No ad sets found in this campaign'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Option 3: Edit Existing */}
            <div
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedPath === 'edit'
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
              }`}
              onClick={() => {
                setSelectedPath('edit');
                setCreateSubOption(null);
              }}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full shrink-0 ${
                  selectedPath === 'edit' ? 'bg-orange-500 text-white' : 'bg-orange-500/10 text-orange-400'
                }`}>
                  <Pencil className="w-6 h-6" />
                </div>
                <div className="flex-grow">
                  <h2 className="text-xl font-bold text-white mb-1">
                    {t('uploader.edit_title')}
                  </h2>
                  <p className="text-gray-400 text-sm mb-1">
                    {t('uploader.edit_when') || 'Choose this to modify campaigns that are already running'}
                  </p>
                  <p className="text-orange-400 text-xs">
                    {t('uploader.edit_examples') || 'Change targeting (location, age) or update ad content (text, image, CTA)'}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-1 ${
                  selectedPath === 'edit' ? 'border-orange-500 bg-orange-500' : 'border-gray-500'
                }`}>
                  {selectedPath === 'edit' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-options for Edit */}
              {selectedPath === 'edit' && (
                <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                  <p className="text-sm text-gray-300 font-medium">
                    {t('uploader.what_to_edit') || 'What would you like to edit?'}
                  </p>

                  {/* Edit Ad Set (Targeting) */}
                  <div
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      editSubOption === 'adset'
                        ? 'border-orange-400 bg-orange-500/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={(e) => { e.stopPropagation(); setEditSubOption('adset'); }}
                  >
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-orange-400" />
                      <div className="flex-grow">
                        <p className="font-medium text-white">
                          {t('uploader.edit_targeting') || 'Edit Targeting (Ad Set)'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {t('uploader.edit_targeting_desc') || 'Change locations, age range, and demographics'}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        editSubOption === 'adset' ? 'border-orange-400 bg-orange-400' : 'border-gray-500'
                      }`} />
                    </div>
                  </div>

                  {/* Edit Ad (Creative) */}
                  <div
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      editSubOption === 'ad'
                        ? 'border-orange-400 bg-orange-500/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={(e) => { e.stopPropagation(); setEditSubOption('ad'); }}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-orange-400" />
                      <div className="flex-grow">
                        <p className="font-medium text-white">
                          {t('uploader.edit_creative') || 'Edit Creative (Ad)'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {t('uploader.edit_creative_desc') || 'Change headline, text, image, video, or CTA button'}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        editSubOption === 'ad' ? 'border-orange-400 bg-orange-400' : 'border-gray-500'
                      }`} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Continue Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleContinue}
              disabled={!canContinue()}
              className={`px-8 py-3 rounded-xl font-semibold text-lg transition-all flex items-center gap-2 ${
                canContinue()
                  ? selectedPath === 'create' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
                    selectedPath === 'add' ? 'bg-purple-500 hover:bg-purple-600 text-white' :
                    'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {t('uploader.continue')}
              <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Help text */}
          {!selectedPath && (
            <p className="text-center text-gray-500 text-sm mt-4">
              {t('uploader.select_option_hint') || 'Select an option above to continue'}
            </p>
          )}
        </div>
      )}
      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <AnalysisTab accountId={selectedAccountId} />
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <RecommendationsTab accountId={selectedAccountId} />
      )}

      {/* AI Chat Tab */}
      {activeTab === 'ai-chat' && (
        <AIChatTab accountId={selectedAccountId} />
      )}
    </MainLayout>
  );
}
