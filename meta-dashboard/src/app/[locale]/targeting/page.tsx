'use client';

/**
 * Targeting Analysis Page
 * Provides in-depth analysis of ad set targeting performance and insights.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Filter, Target, Search, X, Layers } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import DateFilter from '../../../components/DateFilter';
import TargetingTable from '../../../components/targeting/TargetingTable';
import TimeGranularityToggle from '../../../components/campaigns/TimeGranularityToggle';
import ActionsMetricsChart from '../../../components/dashboard/ActionsMetricsChart';
import CreativeBreakdownTabs from '../../../components/creatives/CreativeBreakdownTabs';

// Services & Types
import { fetchBreakdown, fetchTrendData } from '../../../services/campaigns.service';
import { TargetingRow, TargetingTypeMetrics } from '../../../types/targeting.types';
import { DateRange, MetricType } from '../../../types/dashboard.types';
import { TimeGranularity } from '../../../types/campaigns.types';
import { useAccount } from '../../../context/AccountContext';

export default function TargetingPage() {
    const t = useTranslations();
    const locale = useLocale();
    const isRTL = locale === 'ar' || locale === 'he';
    const { selectedAccountId, hasROAS } = useAccount();

    // State
    const [dateRange, setDateRange] = useState<DateRange>({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const [targetingData, setTargetingData] = useState<TargetingRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchValue, setSearchValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [selectedAdsetIds, setSelectedAdsetIds] = useState<number[]>([]);

    // Filter state
    const [isFilterActive, setIsFilterActive] = useState(false);
    const [filteredAdsetIds, setFilteredAdsetIds] = useState<number[]>([]);

    // Chart state
    const [selectedMetric, setSelectedMetric] = useState<MetricType>('spend');
    const [granularity, setGranularity] = useState<TimeGranularity>('day');
    const [trendData, setTrendData] = useState<any[]>([]);
    const [isTrendLoading, setIsTrendLoading] = useState(false);
    const [currency, setCurrency] = useState<string>('USD');

    // Use account-level hasROAS from context (with fallback to local check)
    const hasConversionValue = hasROAS ?? targetingData.some(adset => (adset.conversion_value || 0) > 0);

    // Calculate Targeting Type performance metrics
    const formatMetrics = useMemo(() => {
        // Filter adsets if filter is active
        const adsetsToAnalyze = isFilterActive && filteredAdsetIds.length > 0
            ? targetingData.filter(a => filteredAdsetIds.includes(a.adset_id))
            : targetingData;

        const broadAdsets = adsetsToAnalyze.filter(a => a.targeting_type === 'Broad');
        const lookalikeAdsets = adsetsToAnalyze.filter(a => a.targeting_type === 'Lookalike');
        const interestAdsets = adsetsToAnalyze.filter(a => a.targeting_type === 'Interest');
        const customAdsets = adsetsToAnalyze.filter(a => a.targeting_type === 'Custom Audience');

        const calculateMetrics = (adsetsArray: TargetingRow[]): TargetingTypeMetrics => {
            if (adsetsArray.length === 0) {
                return { avgROAS: 0, avgCTR: 0, totalSpend: 0, count: 0 };
            }

            const totalSpend = adsetsArray.reduce((sum, a) => sum + a.spend, 0);
            const totalConversionValue = adsetsArray.reduce((sum, a) => sum + (a.conversion_value || 0), 0);
            const totalClicks = adsetsArray.reduce((sum, a) => sum + a.clicks, 0);
            const totalImpressions = adsetsArray.reduce((sum, a) => sum + a.impressions, 0);
            const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
            const avgROAS = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

            return {
                avgROAS,
                avgCTR,
                totalSpend,
                count: adsetsArray.length
            };
        };

        return {
            broad: calculateMetrics(broadAdsets),
            lookalike: calculateMetrics(lookalikeAdsets),
            interest: calculateMetrics(interestAdsets),
            custom: calculateMetrics(customAdsets)
        };
    }, [targetingData, isFilterActive, filteredAdsetIds]);

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
                const adsetsData = await fetchBreakdown(
                    dateRange,
                    'adset',
                    'both',
                    statusFilter ? [statusFilter] : [],
                    searchQuery,
                    selectedAccountId || undefined,
                    undefined
                );

                // Apply type filter client-side
                let filteredData = adsetsData;
                if (typeFilter) {
                    filteredData = adsetsData.filter((adset: any) => adset.targeting_type === typeFilter);
                }

                setTargetingData(filteredData as TargetingRow[]);
            } catch (error) {
                console.error('[Targeting Page] Failed to load data:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, [dateRange, searchQuery, typeFilter, statusFilter, selectedAccountId]);

    // Fetch trend data when granularity changes
    useEffect(() => {
        const fetchTrend = async () => {
            if (!dateRange.startDate || !dateRange.endDate) return;

            setIsTrendLoading(true);
            try {
                const data = await fetchTrendData(
                    dateRange,
                    granularity,
                    selectedAccountId || undefined,
                    isFilterActive ? filteredAdsetIds : undefined
                );
                setTrendData(data || []);
            } catch (err: any) {
                console.error('[Targeting Page] Error fetching trend data:', err);
            } finally {
                setIsTrendLoading(false);
            }
        };

        fetchTrend();
    }, [dateRange, granularity, selectedAccountId, isFilterActive, filteredAdsetIds]);

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
            title={t('nav.targeting_performance')}
            description={t('targeting.subtitle')}
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
                                placeholder={t('targeting.search_placeholder')}
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
                                <option value="Broad" className="bg-gray-900 text-white">Broad</option>
                                <option value="Lookalike" className="bg-gray-900 text-white">Lookalike</option>
                                <option value="Interest" className="bg-gray-900 text-white">Interest</option>
                                <option value="Custom Audience" className="bg-gray-900 text-white">Custom Audience</option>
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
                    {/* Filter Page Button */}
                    {selectedAdsetIds.length > 0 && !isFilterActive && (
                        <button
                            onClick={() => {
                                setIsFilterActive(true);
                                setFilteredAdsetIds(selectedAdsetIds);
                            }}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filter ({selectedAdsetIds.length})</span>
                        </button>
                    )}

                    {/* Clear Filter Button */}
                    {isFilterActive && (
                        <button
                            onClick={() => {
                                setIsFilterActive(false);
                                setFilteredAdsetIds([]);
                                setSelectedAdsetIds([]);
                            }}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
                        >
                            <X className="w-4 h-4" />
                            <span>Clear Filter</span>
                        </button>
                    )}

                </div>
            </div>

            {/* Targeting Type Comparison Table */}
            {!isLoading && targetingData.length > 0 && (
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
                                { key: 'broad', name: 'Broad', targetingType: 'Broad', icon: Layers, bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/20', textClass: 'text-blue-400' },
                                { key: 'lookalike', name: 'Lookalike', targetingType: 'Lookalike', icon: Target, bgClass: 'bg-purple-500/10', borderClass: 'border-purple-500/20', textClass: 'text-purple-400' },
                                { key: 'interest', name: 'Interest', targetingType: 'Interest', icon: Target, bgClass: 'bg-green-500/10', borderClass: 'border-green-500/20', textClass: 'text-green-400' },
                                { key: 'custom', name: 'Custom Audience', targetingType: 'Custom Audience', icon: Target, bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/20', textClass: 'text-orange-400' },
                            ]
                                .map((type) => {
                                    const data = formatMetrics[type.key as keyof typeof formatMetrics];
                                    const adsetsOfType = targetingData.filter(a => a.targeting_type === type.targetingType);
                                    const totalClicks = adsetsOfType.reduce((sum, a) => sum + a.clicks, 0);
                                    const totalConversions = adsetsOfType.reduce((sum, a) => sum + (a.conversions || 0), 0);
                                    const avgCPC = totalClicks > 0 ? data.totalSpend / totalClicks : 0;
                                    const avgCPA = totalConversions > 0 ? data.totalSpend / totalConversions : 0;
                                    return { ...type, data, totalConversions, avgCPC, avgCPA };
                                })
                                .sort((a, b) => b.data.totalSpend - a.data.totalSpend)
                                .map((type) => (
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
                                        <td className="px-4 py-3 text-right text-sm font-bold text-white">${type.avgCPC.toFixed(1)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-white">{type.totalConversions.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-white">${type.avgCPA.toFixed(1)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Targeting Table */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-100 mb-4">
                    {isFilterActive ? `Filtered Ad Sets (${filteredAdsetIds.length})` : t('targeting.table_title')}
                </h2>
                <TargetingTable
                    targetingData={isFilterActive && filteredAdsetIds.length > 0
                        ? targetingData.filter(a => filteredAdsetIds.includes(a.adset_id))
                        : targetingData
                    }
                    isLoading={isLoading}
                    currency={currency}
                    isRTL={isRTL}
                    selectedAdsetIds={selectedAdsetIds}
                    onSelectionChange={setSelectedAdsetIds}
                />
            </div>

            {/* Performance Chart */}
            <div className="mb-8">
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-gray-100">Performance Over Time</h2>
                        {isFilterActive && (
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Filtered ({filteredAdsetIds.length} ad sets)
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

            {/* Breakdown Tabs */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-100">Breakdown Analysis</h2>
                    {isFilterActive && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Filtered ({filteredAdsetIds.length} ad sets)
                        </span>
                    )}
                </div>
                <CreativeBreakdownTabs
                    dateRange={dateRange}
                    currency={currency}
                    isRTL={isRTL}
                    accountId={selectedAccountId || undefined}
                    creativeIds={isFilterActive ? filteredAdsetIds : null}
                />
            </div>
        </MainLayout>
    );
}
