'use client';

/**
 * Creative Insights Page
 * Provides in-depth analysis of ad creatives and video performance patterns.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Filter, Play, Image as ImageIcon, SortAsc, LayoutGrid, Search, TrendingUp } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import Navigation from '../../../components/Navigation';
import DateFilter from '../../../components/DateFilter';
import CreativeCard from '../../../components/creatives/CreativeCard';
import CreativesTable from '../../../components/creatives/CreativesTable';
import VideoInsightsSection from '../../../components/creatives/VideoInsightsSection';
import SkeletonMetricCard from '../../../components/dashboard/SkeletonMetricCard';
import InsightCard from '../../../components/insights/InsightCard';
import TimeGranularityToggle from '../../../components/campaigns/TimeGranularityToggle';
import ActionsMetricsChart from '../../../components/dashboard/ActionsMetricsChart';
import CreativeComparisonModal from '../../../components/creatives/CreativeComparisonModal';
import CreativeBreakdownTabs from '../../../components/creatives/CreativeBreakdownTabs';

// Services & Types
import { fetchCreatives, fetchVideoInsights } from '../../../services/creatives.service';
import { fetchInsightsSummary, InsightItem } from '../../../services/insights.service';
import { fetchTrendData } from '../../../services/campaigns.service';
import { CreativeMetrics, VideoInsightsResponse, CreativeSortMetric } from '../../../types/creatives.types';
import { DateRange, MetricType } from '../../../types/dashboard.types';
import { TimeGranularity } from '../../../types/campaigns.types';
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
    const [searchValue, setSearchValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showComparison, setShowComparison] = useState(false);
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [selectedCreativeIds, setSelectedCreativeIds] = useState<number[]>([]);
    const [showComparisonModal, setShowComparisonModal] = useState(false);

    // Chart state
    const [selectedMetric, setSelectedMetric] = useState<MetricType>('spend');
    const [granularity, setGranularity] = useState<TimeGranularity>('day');
    const [trendData, setTrendData] = useState<any[]>([]);
    const [isTrendLoading, setIsTrendLoading] = useState(false);
    const [currency, setCurrency] = useState<string>('USD');

    // Check if any creative has conversion value
    const hasConversionValue = creatives.some(creative => (creative.conversion_value || 0) > 0);

    // Calculate Image vs Video performance metrics
    const formatMetrics = useMemo(() => {
        const imageCreatives = creatives.filter(c => !c.is_video);
        const videoCreatives = creatives.filter(c => c.is_video);

        const calculateMetrics = (creativesArray: CreativeMetrics[]) => {
            if (creativesArray.length === 0) {
                return { avgROAS: 0, avgCTR: 0, avgHookRate: 0, totalSpend: 0, count: 0 };
            }

            const totalSpend = creativesArray.reduce((sum, c) => sum + c.spend, 0);
            const totalConversionValue = creativesArray.reduce((sum, c) => sum + (c.conversion_value || 0), 0);
            const totalClicks = creativesArray.reduce((sum, c) => sum + c.clicks, 0);
            const totalImpressions = creativesArray.reduce((sum, c) => sum + c.impressions, 0);
            const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
            const avgROAS = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

            // Video-specific metrics
            const videosWithHookRate = creativesArray.filter(c => c.hook_rate !== null);
            const avgHookRate = videosWithHookRate.length > 0
                ? videosWithHookRate.reduce((sum, c) => sum + (c.hook_rate || 0), 0) / videosWithHookRate.length
                : 0;

            return {
                avgROAS,
                avgCTR,
                avgHookRate,
                totalSpend,
                count: creativesArray.length
            };
        };

        return {
            image: calculateMetrics(imageCreatives),
            video: calculateMetrics(videoCreatives)
        };
    }, [creatives]);

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(searchValue);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchValue]);

    // Load Data
    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            try {
                const [creativesData, videoInsightsData, insightsData] = await Promise.all([
                    fetchCreatives({
                        dateRange,
                        sort_by: sortBy,
                        search_query: searchQuery,
                        is_video: typeFilter === 'video' ? true : typeFilter === 'image' ? false : undefined,
                        ad_status: statusFilter || undefined,
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
    }, [dateRange, sortBy, mediaFilter, searchQuery, typeFilter, statusFilter, selectedAccountId]);

    // Fetch trend data when granularity changes
    useEffect(() => {
        const fetchTrend = async () => {
            if (!dateRange.startDate || !dateRange.endDate) return;

            setIsTrendLoading(true);
            try {
                const data = await fetchTrendData(dateRange, granularity, selectedAccountId);
                setTrendData(data || []);
            } catch (err: any) {
                console.error('[Creatives Page] Error fetching trend data:', err);
            } finally {
                setIsTrendLoading(false);
            }
        };

        fetchTrend();
    }, [dateRange, granularity, selectedAccountId]);

    // Map trend data for chart
    const chartData = useMemo(() => {
        return trendData.map((point) => ({
            date: point.date,
            total_spend: point.spend || 0,
            total_impressions: point.impressions || 0,
            total_clicks: point.clicks || 0,
            total_conversions: point.conversions || 0,
            total_leads: 0,
            conversion_value: 0,
        }));
    }, [trendData]);

    // Handle date range change safely to avoid infinite loops
    const handleDateRangeChange = useCallback((start: string | null, end: string | null) => {
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
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <DateFilter
                        startDate={dateRange.startDate}
                        endDate={dateRange.endDate}
                        onDateRangeChange={handleDateRangeChange}
                        lang={locale as any}
                        t={t as any}
                        isRTL={isRTL}
                    />

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {/* Search Box */}
                        <div className="relative flex-1 md:w-64">
                            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500`} />
                            <input
                                type="text"
                                placeholder="Search creatives..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                className={`w-full bg-card-bg/40 border border-border-subtle rounded-xl py-2.5 ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'} text-sm text-white focus:border-accent/50 outline-none transition-all placeholder:text-gray-600`}
                            />
                        </div>

                        {/* Type Filter */}
                        <div className="relative">
                            <Filter className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500`} />
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className={`bg-card-bg/40 border border-border-subtle rounded-xl py-2.5 ${isRTL ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8'} text-sm text-white focus:border-accent/50 outline-none transition-all appearance-none cursor-pointer min-w-[140px]`}
                            >
                                <option value="" className="bg-gray-900 text-white">All Types</option>
                                <option value="video" className="bg-gray-900 text-white">Video</option>
                                <option value="image" className="bg-gray-900 text-white">Image</option>
                            </select>
                            <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none`}>
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                            <Filter className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500`} />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={`bg-card-bg/40 border border-border-subtle rounded-xl py-2.5 ${isRTL ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8'} text-sm text-white focus:border-accent/50 outline-none transition-all appearance-none cursor-pointer min-w-[140px]`}
                            >
                                <option value="" className="bg-gray-900 text-white">All Status</option>
                                <option value="ACTIVE" className="bg-gray-900 text-white">Active</option>
                                <option value="PAUSED" className="bg-gray-900 text-white">Paused</option>
                            </select>
                            <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none`}>
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Compare Button - Shows when 2-5 creatives selected */}
                    {selectedCreativeIds.length >= 2 && selectedCreativeIds.length <= 5 && (
                        <button
                            onClick={() => setShowComparisonModal(true)}
                            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
                        >
                            <span>Compare ({selectedCreativeIds.length})</span>
                        </button>
                    )}

                    {/* Comparison Toggle */}
                    <div className="flex items-center gap-2 bg-card-bg/40 border border-border-subtle rounded-xl px-4 py-2.5">
                        <span className="text-sm text-gray-400">Compare Periods</span>
                        <button
                            onClick={() => setShowComparison(!showComparison)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 ${showComparison ? 'bg-accent' : 'bg-gray-700'}`}
                        >
                            <span className="sr-only">Enable comparison</span>
                            <span
                                className={`${showComparison ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Image vs Video Performance Cards */}
            {!isLoading && creatives.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {/* Image Performance Card */}
                    <div className="card-gradient rounded-2xl border border-border-subtle p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Image Creatives</h3>
                            </div>
                            {formatMetrics.image.avgROAS > formatMetrics.video.avgROAS && (
                                <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                                    Winner
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Avg ROAS</p>
                                <p className="text-2xl font-bold text-white">{formatMetrics.image.avgROAS.toFixed(2)}x</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Avg CTR</p>
                                <p className="text-2xl font-bold text-white">{formatMetrics.image.avgCTR.toFixed(2)}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Total Spend</p>
                                <p className="text-xl font-bold text-white">${formatMetrics.image.totalSpend.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Count</p>
                                <p className="text-xl font-bold text-white">{formatMetrics.image.count}</p>
                            </div>
                        </div>
                    </div>

                    {/* Video Performance Card */}
                    <div className="card-gradient rounded-2xl border border-border-subtle p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                    <Play className="w-5 h-5 text-purple-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Video Creatives</h3>
                            </div>
                            {formatMetrics.video.avgROAS > formatMetrics.image.avgROAS && (
                                <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                                    Winner
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Avg ROAS</p>
                                <p className="text-2xl font-bold text-white">{formatMetrics.video.avgROAS.toFixed(2)}x</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Avg CTR</p>
                                <p className="text-2xl font-bold text-white">{formatMetrics.video.avgCTR.toFixed(2)}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Avg Hook Rate</p>
                                <p className="text-xl font-bold text-white">{formatMetrics.video.avgHookRate.toFixed(1)}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Total Spend</p>
                                <p className="text-xl font-bold text-white">${formatMetrics.video.totalSpend.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Creatives Table */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-100 mb-4">All Creatives</h2>
                <CreativesTable
                    creatives={creatives}
                    isLoading={isLoading}
                    currency={currency}
                    isRTL={isRTL}
                    dateRange={dateRange}
                    accountId={selectedAccountId}
                    selectedCreativeIds={selectedCreativeIds}
                    onSelectionChange={setSelectedCreativeIds}
                />
            </div>

            {/* Performance Chart */}
            <div className="mb-8">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <h2 className="text-2xl font-bold text-gray-100">Performance Over Time</h2>
                    <TimeGranularityToggle
                        selected={granularity}
                        onChange={setGranularity}
                        isRTL={isRTL}
                    />
                </div>

                <ActionsMetricsChart
                    dailyData={chartData}
                    selectedMetric={selectedMetric}
                    onMetricChange={setSelectedMetric}
                    isLoading={isTrendLoading}
                    currency={currency}
                    granularity={granularity}
                />
            </div>

            {/* Creative Breakdown Tabs */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-100 mb-4">Breakdown Analysis</h2>
                <CreativeBreakdownTabs
                    dateRange={dateRange}
                    currency={currency}
                    isRTL={isRTL}
                    accountId={selectedAccountId}
                    creativeId={null}
                />
            </div>

            {/* Quick Insights */}
            <div className="mb-8">
                <InsightCard
                    insights={insights}
                    isLoading={isLoading}
                    isRTL={isRTL}
                />
            </div>

            {/* Creative Comparison Modal */}
            <CreativeComparisonModal
                creativeIds={selectedCreativeIds}
                creatives={creatives}
                dateRange={dateRange}
                accountId={selectedAccountId}
                isOpen={showComparisonModal}
                onClose={() => {
                    setShowComparisonModal(false);
                    setSelectedCreativeIds([]);
                }}
            />
        </MainLayout>
    );
}
