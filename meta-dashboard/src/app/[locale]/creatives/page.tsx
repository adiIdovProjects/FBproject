'use client';

/**
 * Creative Insights Page
 * Provides in-depth analysis of ad creatives and video performance patterns.
 */

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
    Title,
    Text,
    Grid,
    TabGroup,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Select,
    SelectItem,
    Badge
} from '@tremor/react';
import { Filter, Play, Image as ImageIcon, SortAsc, LayoutGrid } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import Navigation from '../../../components/Navigation';
import DateFilter from '../../../components/DateFilter';
import CreativeCard from '../../../components/creatives/CreativeCard';
import VideoInsightsSection from '../../../components/creatives/VideoInsightsSection';
import SkeletonMetricCard from '../../../components/dashboard/SkeletonMetricCard';
import InsightCard from '../../../components/insights/InsightCard';

// Services & Types
import { fetchCreatives, fetchVideoInsights } from '../../../services/creatives.service';
import { fetchInsightsSummary, InsightItem } from '../../../services/insights.service';
import { CreativeMetrics, VideoInsightsResponse, CreativeSortMetric } from '../../../types/creatives.types';
import { DateRange } from '../../../types/dashboard.types';
import { useAccount } from '../../../context/AccountContext'; // Import context

export default function CreativesPage() {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';
    const { selectedAccountId } = useAccount(); // Use context

    // State
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const [creatives, setCreatives] = useState<CreativeMetrics[]>([]);
    const [videoInsights, setVideoInsights] = useState<VideoInsightsResponse | null>(null);
    const [insights, setInsights] = useState<InsightItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState<CreativeSortMetric>('spend');
    const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'image'>('all');

    // Check if any creative has conversion value
    const hasConversionValue = creatives.some(creative => (creative.conversion_value || 0) > 0);

    // Load Data
    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            try {
                const [creativesData, videoInsightsData, insightsData] = await Promise.all([
                    fetchCreatives({
                        dateRange,
                        sort_by: sortBy,
                    }, selectedAccountId),
                    fetchVideoInsights(dateRange, selectedAccountId),
                    fetchInsightsSummary(dateRange, 'creatives', undefined, selectedAccountId)
                ]);

                setCreatives(creativesData);
                setVideoInsights(videoInsightsData);
                setInsights(insightsData);
            } catch (error) {
                console.error('[Creatives Page] Failed to load data:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, [dateRange, sortBy, mediaFilter, selectedAccountId]);

    // Handle date range change safely to avoid infinite loops
    const handleDateRangeChange = React.useCallback((start: string | null, end: string | null) => {
        if (!start || !end) return;
        setDateRange(prev => {
            if (prev.startDate === start && prev.endDate === end) return prev;
            return { startDate: start, endDate: end };
        });
    }, []);

    return (
        <MainLayout
            title={t('creatives.title')}
            description={t('creatives.subtitle')}
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                <DateFilter
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    onDateRangeChange={handleDateRangeChange}
                    lang={locale as any}
                    t={t as any}
                    isRTL={isRTL}
                />

                <div className="flex flex-wrap items-center gap-6">
                    {/* Video Only Toggle */}
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${mediaFilter === 'video' ? 'bg-indigo-600' : 'bg-gray-700'}`}
                            onClick={() => setMediaFilter(mediaFilter === 'video' ? 'all' : 'video')}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${mediaFilter === 'video' ? 'left-7' : 'left-1'}`} />
                        </div>
                        <Text className="text-xs text-gray-400 font-medium">{t('creatives.videos_only')}</Text>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-3 border-l border-gray-800 pl-6">
                        <SortAsc className="w-4 h-4 text-gray-500" />
                        <Select
                            value={sortBy}
                            onValueChange={(val: any) => setSortBy(val)}
                            className="w-48 border-none bg-gray-900 shadow-xl"
                        >
                            <SelectItem value="spend">{t('actions.sort_by')}: {t('metrics.spend')}</SelectItem>
                            {hasConversionValue && (
                                <SelectItem value="roas">{t('actions.sort_by')}: {t('metrics.roas')}</SelectItem>
                            )}
                            <SelectItem value="hook_rate">{t('actions.sort_by')}: {t('creatives.hook_rate')}</SelectItem>
                            <SelectItem value="conversions">{t('actions.sort_by')}: {t('metrics.conversions')}</SelectItem>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Quick Insights */}
            <div className="mb-8">
                <InsightCard
                    insights={insights}
                    isLoading={isLoading}
                    isRTL={isRTL}
                />
            </div>

            <TabGroup>
                <TabList className="mb-6">
                    <Tab icon={LayoutGrid}>{t('creatives.all_creatives')}</Tab>
                    <Tab icon={Play}>{t('creatives.video_deep_dive')}</Tab>
                </TabList>

                <TabPanels>
                    {/* All Creatives Grid */}
                    <TabPanel>
                        {isLoading ? (
                            <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
                                {[...Array(8)].map((_, i) => (
                                    <SkeletonMetricCard key={i} />
                                ))}
                            </Grid>
                        ) : (
                            <>
                                {creatives.length > 0 ? (
                                    <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
                                        {creatives.map((creative) => (
                                            <CreativeCard key={creative.creative_id} creative={creative} />
                                        ))}
                                    </Grid>
                                ) : (
                                    <div className="bg-gray-800 border border-dashed border-gray-700 rounded-xl p-12 text-center">
                                        <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                        <Title className="text-gray-400">{t('common.error_loading')}</Title>
                                        <Text className="text-gray-500 mt-2">{t('common.no_data_available')}</Text>
                                    </div>
                                )}
                            </>
                        )}
                    </TabPanel>

                    {/* Video Insights Section */}
                    <TabPanel>
                        {videoInsights ? (
                            <VideoInsightsSection data={videoInsights} isLoading={isLoading} />
                        ) : (
                            <div className="bg-gray-800 border border-dashed border-gray-700 rounded-xl p-12 text-center">
                                <Play className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                <Title className="text-gray-400">{t('common.no_data_available')}</Title>
                                <Text className="text-gray-500 mt-2">{t('common.error_loading')}</Text>
                            </div>
                        )}
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </MainLayout>
    );
}
