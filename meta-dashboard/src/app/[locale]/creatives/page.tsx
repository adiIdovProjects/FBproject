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
import { Filter, Play, Image as ImageIcon, SortAsc, LayoutGrid, Search, TrendingUp, X } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import Navigation from '../../../components/Navigation';
import DateFilter from '../../../components/DateFilter';
import CreativeCard from '../../../components/creatives/CreativeCard';
import CreativesTable from '../../../components/creatives/CreativesTable';
import SkeletonMetricCard from '../../../components/dashboard/SkeletonMetricCard';
// Output removed by refactor

import TimeGranularityToggle from '../../../components/campaigns/TimeGranularityToggle';
import ActionsMetricsChart from '../../../components/dashboard/ActionsMetricsChart';
import CreativeComparisonModal from '../../../components/creatives/CreativeComparisonModal';
import CreativeBreakdownTabs from '../../../components/creatives/CreativeBreakdownTabs';

// Services & Types
import { fetchCreatives } from '../../../services/creatives.service';
// Output removed by refactor

import { fetchTrendData } from '../../../services/campaigns.service';
import { CreativeMetrics, VideoInsightsResponse, CreativeSortMetric } from '../../../types/creatives.types';
import { DateRange, MetricType } from '../../../types/dashboard.types';
import { TimeGranularity } from '../../../types/campaigns.types';
import { useAccount } from '../../../context/AccountContext'; // Import context

export default function CreativesPage() {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';
    const { selectedAccountId, hasROAS } = useAccount(); // Use context

    // State
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const [creatives, setCreatives] = useState<CreativeMetrics[]>([]);
    const [videoInsights, setVideoInsights] = useState<VideoInsightsResponse | null>(null);
    // Insights state - removed
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

    // Filter state
    const [isFilterActive, setIsFilterActive] = useState(false);
    const [filteredCreativeIds, setFilteredCreativeIds] = useState<number[]>([]);

    // Chart state
    const [selectedMetric, setSelectedMetric] = useState<MetricType>('spend');
    const [granularity, setGranularity] = useState<TimeGranularity>('day');
    const [trendData, setTrendData] = useState<any[]>([]);
    const [isTrendLoading, setIsTrendLoading] = useState(false);
    const [currency, setCurrency] = useState<string>('USD');

    // Use account-level hasROAS from context (with fallback to local check)
    const hasConversionValue = hasROAS ?? creatives.some(creative => (creative.conversion_value || 0) > 0);

    // Calculate Image, Carousel, and Video performance metrics
    const formatMetrics = useMemo(() => {
        // Filter creatives if filter is active
        const creativesToAnalyze = isFilterActive && filteredCreativeIds.length > 0
            ? creatives.filter(c => filteredCreativeIds.includes(c.creative_id))
            : creatives;

        const imageCreatives = creativesToAnalyze.filter(c => !c.is_video && !c.is_carousel);
        const carouselCreatives = creativesToAnalyze.filter(c => c.is_carousel);
        const videoCreatives = creativesToAnalyze.filter(c => c.is_video);

        const calculateMetrics = (creativesArray: CreativeMetrics[]) => {
            if (creativesArray.length === 0) {
                return { totalSpend: 0, avgCTR: 0, avgCPC: 0, totalConversions: 0, count: 0 };
            }

            const totalSpend = creativesArray.reduce((sum, c) => sum + c.spend, 0);
            const totalClicks = creativesArray.reduce((sum, c) => sum + c.clicks, 0);
            const totalImpressions = creativesArray.reduce((sum, c) => sum + c.impressions, 0);
            const totalConversions = creativesArray.reduce((sum, c) => sum + (c.conversions || 0), 0);
            const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
            const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;

            return {
                totalSpend,
                avgCTR,
                avgCPC,
                totalConversions,
                count: creativesArray.length
            };
        };

        return {
            image: calculateMetrics(imageCreatives),
            carousel: calculateMetrics(carouselCreatives),
            video: calculateMetrics(videoCreatives)
        };
    }, [creatives, isFilterActive, filteredCreativeIds]);

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
                // For carousel filter, we fetch all non-videos and filter on frontend
                const isVideoParam = typeFilter === 'video' ? true :
                    (typeFilter === 'image' || typeFilter === 'carousel') ? false : undefined;

                const creativesData = await fetchCreatives({
                    dateRange,
                    sort_by: sortBy,
                    search_query: searchQuery,
                    is_video: isVideoParam,
                    ad_status: statusFilter || undefined,
                }, selectedAccountId);

                // Apply frontend filtering for image vs carousel
                let filteredData = creativesData;
                if (typeFilter === 'image') {
                    filteredData = creativesData.filter(c => !c.is_carousel);
                } else if (typeFilter === 'carousel') {
                    filteredData = creativesData.filter(c => c.is_carousel);
                }

                setCreatives(filteredData);
                // Output removed by refactor

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
                const data = await fetchTrendData(
                    dateRange,
                    granularity,
                    selectedAccountId,
                    isFilterActive ? filteredCreativeIds : null
                );
                setTrendData(data || []);
            } catch (err: any) {
                console.error('[Creatives Page] Error fetching trend data:', err);
            } finally {
                setIsTrendLoading(false);
            }
        };

        fetchTrend();
    }, [dateRange, granularity, selectedAccountId, isFilterActive, filteredCreativeIds]);

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
            title={t('nav.creative_performance')}
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
                                <option value="carousel" className="bg-gray-900 text-white">Carousel</option>
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
                    {/* Filter Page Button - Shows when creatives selected and filter not active */}
                    {selectedCreativeIds.length > 0 && !isFilterActive && (
                        <button
                            onClick={() => {
                                setIsFilterActive(true);
                                setFilteredCreativeIds(selectedCreativeIds);
                            }}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filter ({selectedCreativeIds.length})</span>
                        </button>
                    )}

                    {/* Clear Filter Button - Shows when filter is active */}
                    {isFilterActive && (
                        <button
                            onClick={() => {
                                setIsFilterActive(false);
                                setFilteredCreativeIds([]);
                                setSelectedCreativeIds([]);
                            }}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
                        >
                            <X className="w-4 h-4" />
                            <span>Clear Filter</span>
                        </button>
                    )}

                    {/* Compare Button - Shows when 2-5 creatives selected */}
                    {selectedCreativeIds.length >= 2 && selectedCreativeIds.length <= 5 && !isFilterActive && (
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

            {/* Creative Type Comparison Table */}
            {!isLoading && creatives.length > 0 && (
                <div className="card-gradient rounded-xl border border-border-subtle overflow-hidden mb-8">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border-subtle bg-black/20">
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Spend</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">CTR</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">CPC</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Conversions</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">CPA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {[
                                { key: 'image', name: 'Image', data: formatMetrics.image, icon: ImageIcon, bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/20', textClass: 'text-blue-400' },
                                { key: 'carousel', name: 'Carousel', data: formatMetrics.carousel, icon: LayoutGrid, bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/20', textClass: 'text-orange-400' },
                                { key: 'video', name: 'Video', data: formatMetrics.video, icon: Play, bgClass: 'bg-purple-500/10', borderClass: 'border-purple-500/20', textClass: 'text-purple-400' },
                            ]
                                .sort((a, b) => b.data.totalSpend - a.data.totalSpend)
                                .map((type) => {
                                    const cpa = type.data.totalConversions > 0 ? type.data.totalSpend / type.data.totalConversions : 0;
                                    return (
                                        <tr key={type.key} className="hover:bg-white/[0.02]">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-lg ${type.bgClass} border ${type.borderClass} flex items-center justify-center`}>
                                                        <type.icon className={`w-3.5 h-3.5 ${type.textClass}`} />
                                                    </div>
                                                    <span className="text-sm font-medium text-white">{type.name}</span>
                                                    <span className="text-xs text-gray-500">({type.data.count})</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-white">${Math.round(type.data.totalSpend).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-white">{type.data.avgCTR.toFixed(2)}%</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-white">${type.data.avgCPC.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-white">{type.data.totalConversions.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-white">${cpa.toFixed(1)}</td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Creatives Table */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-100 mb-4">
                    {isFilterActive ? `Filtered Creatives (${filteredCreativeIds.length})` : 'All Creatives'}
                </h2>
                <CreativesTable
                    creatives={isFilterActive && filteredCreativeIds.length > 0
                        ? creatives.filter(c => filteredCreativeIds.includes(c.creative_id))
                        : creatives
                    }
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
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-gray-100">Performance Over Time</h2>
                        {isFilterActive && (
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Filtered ({filteredCreativeIds.length} creatives)
                            </span>
                        )}
                    </div>
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
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-100">Breakdown Analysis</h2>
                    {isFilterActive && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Filtered ({filteredCreativeIds.length} creatives)
                        </span>
                    )}
                </div>
                <CreativeBreakdownTabs
                    dateRange={dateRange}
                    currency={currency}
                    isRTL={isRTL}
                    accountId={selectedAccountId}
                    creativeIds={isFilterActive ? filteredCreativeIds : null}
                />
            </div>

            {/* Quick Insights - Removed */}

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
