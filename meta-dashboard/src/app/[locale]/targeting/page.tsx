'use client';

/**
 * Targeting Analysis Page
 * Provides in-depth analysis of ad set targeting performance and insights.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Filter, Target, Search, X, Layers, TrendingUp, TrendingDown } from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';
import DateFilter from '../../../components/DateFilter';
import TargetingTable from '../../../components/targeting/TargetingTable';
import TimeGranularityToggle from '../../../components/campaigns/TimeGranularityToggle';
import ActionsMetricsChart from '../../../components/dashboard/ActionsMetricsChart';
import CreativeBreakdownTabs from '../../../components/creatives/CreativeBreakdownTabs';
import { useInView } from '../../../hooks/useInView';

// Services & Types
import { fetchBreakdown, fetchBreakdownWithComparison, fetchTrendData } from '../../../services/campaigns.service';
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

    // Comparison toggle
    const [showComparison, setShowComparison] = useState(false);

    // Chart state
    const [selectedMetric, setSelectedMetric] = useState<MetricType>('spend');
    const [granularity, setGranularity] = useState<TimeGranularity>('day');
    const [trendData, setTrendData] = useState<any[]>([]);
    const [isTrendLoading, setIsTrendLoading] = useState(false);
    const [currency, setCurrency] = useState<string>('USD');

    // Viewport-based lazy loading for breakdown section
    const [breakdownRef, isBreakdownVisible] = useInView();

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

        const calculateMetrics = (adsetsArray: TargetingRow[]) => {
            if (adsetsArray.length === 0) {
                return {
                    avgROAS: 0, avgCTR: 0, totalSpend: 0, count: 0,
                    totalClicks: 0, totalConversions: 0, avgCPC: 0, avgCPA: 0,
                    prevSpend: null, prevCTR: null, prevCPC: null, prevConversions: null, prevCPA: null,
                    spendChangePct: null, ctrChangePct: null, cpcChangePct: null, conversionsChangePct: null, cpaChangePct: null
                };
            }

            const totalSpend = adsetsArray.reduce((sum, a) => sum + a.spend, 0);
            const totalConversionValue = adsetsArray.reduce((sum, a) => sum + (a.conversion_value || 0), 0);
            const totalClicks = adsetsArray.reduce((sum, a) => sum + a.clicks, 0);
            const totalImpressions = adsetsArray.reduce((sum, a) => sum + a.impressions, 0);
            const totalConversions = adsetsArray.reduce((sum, a) => sum + (a.conversions || 0), 0);
            const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
            const avgROAS = totalSpend > 0 ? totalConversionValue / totalSpend : 0;
            const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
            const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;

            // Calculate previous period metrics if comparison data exists
            const prevSpend = adsetsArray.reduce((sum, a) => sum + (a.previous_spend || 0), 0);
            const prevClicks = adsetsArray.reduce((sum, a) => sum + (a.previous_clicks || 0), 0);
            const prevImpressions = adsetsArray.reduce((sum, a) => sum + (a.previous_impressions || 0), 0);
            const prevConversions = adsetsArray.reduce((sum, a) => sum + (a.previous_conversions || 0), 0);
            const prevCTR = prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0;
            const prevCPC = prevClicks > 0 ? prevSpend / prevClicks : 0;
            const prevCPA = prevConversions > 0 ? prevSpend / prevConversions : 0;

            // Calculate change percentages
            const calcChange = (current: number, previous: number) => {
                if (previous === 0) return current > 0 ? 100 : null;
                return ((current - previous) / previous) * 100;
            };

            const hasPrevData = prevSpend > 0 || prevClicks > 0;

            return {
                avgROAS,
                avgCTR,
                totalSpend,
                count: adsetsArray.length,
                totalClicks,
                totalConversions,
                avgCPC,
                avgCPA,
                prevSpend: hasPrevData ? prevSpend : null,
                prevCTR: hasPrevData ? prevCTR : null,
                prevCPC: hasPrevData ? prevCPC : null,
                prevConversions: hasPrevData ? prevConversions : null,
                prevCPA: hasPrevData ? prevCPA : null,
                spendChangePct: hasPrevData ? calcChange(totalSpend, prevSpend) : null,
                ctrChangePct: hasPrevData ? calcChange(avgCTR, prevCTR) : null,
                cpcChangePct: hasPrevData ? calcChange(avgCPC, prevCPC) : null,
                conversionsChangePct: hasPrevData ? calcChange(totalConversions, prevConversions) : null,
                cpaChangePct: hasPrevData ? calcChange(avgCPA, prevCPA) : null
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
                // Use comparison endpoint when showComparison is enabled
                const adsetsData = showComparison
                    ? await fetchBreakdownWithComparison(
                        dateRange,
                        'adset',
                        'both',
                        statusFilter ? [statusFilter] : [],
                        searchQuery,
                        selectedAccountId || undefined,
                        undefined
                    )
                    : await fetchBreakdown(
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
    }, [dateRange, searchQuery, typeFilter, statusFilter, selectedAccountId, showComparison]);

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

            {/* Targeting Type Comparison Table */}
            {!isLoading && targetingData.length > 0 && (
                <div className="card-gradient rounded-xl border border-border-subtle overflow-hidden mb-8">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border-subtle bg-black/20">
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Spend</th>
                                {showComparison && <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">VS PREV</th>}
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">CTR</th>
                                {showComparison && <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">VS PREV</th>}
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">CPC</th>
                                {showComparison && <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">VS PREV</th>}
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Conversions</th>
                                {showComparison && <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">VS PREV</th>}
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">CPA</th>
                                {showComparison && <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">VS PREV</th>}
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
                                    return { ...type, data };
                                })
                                .sort((a, b) => b.data.totalSpend - a.data.totalSpend)
                                .map((type) => {
                                    const renderChangeBadge = (changePct: number | null | undefined, metricType: 'cost' | 'performance' | 'neutral', prevValue?: number | null, formatter?: (v: number) => string) => {
                                        if (changePct === null || changePct === undefined) return <span className="text-gray-500 text-sm">-</span>;
                                        const isPositive = changePct > 0;
                                        const isNegative = changePct < 0;
                                        let colorClass = 'text-gray-400'; // neutral
                                        if (metricType === 'cost') {
                                            colorClass = isNegative ? 'text-green-400' : 'text-red-400';
                                        } else if (metricType === 'performance') {
                                            colorClass = isPositive ? 'text-green-400' : 'text-red-400';
                                        }
                                        const Icon = isPositive ? TrendingUp : TrendingDown;
                                        const tooltip = prevValue !== null && prevValue !== undefined && formatter
                                            ? `Previous: ${formatter(prevValue)}` : undefined;
                                        return (
                                            <div className={`inline-flex items-center gap-1 text-xs font-medium ${colorClass} cursor-help`} title={tooltip}>
                                                <Icon className="w-3 h-3" />
                                                <span>{Math.abs(changePct).toFixed(1)}%</span>
                                            </div>
                                        );
                                    };

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
                                            {showComparison && (
                                                <td className="px-4 py-3 text-right">
                                                    {renderChangeBadge(type.data.spendChangePct, 'neutral', type.data.prevSpend, (v) => `$${Math.round(v).toLocaleString()}`)}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-right text-sm font-bold text-white">{type.data.avgCTR.toFixed(2)}%</td>
                                            {showComparison && (
                                                <td className="px-4 py-3 text-right">
                                                    {renderChangeBadge(type.data.ctrChangePct, 'performance', type.data.prevCTR, (v) => `${v.toFixed(2)}%`)}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-right text-sm font-bold text-white">${type.data.avgCPC.toFixed(1)}</td>
                                            {showComparison && (
                                                <td className="px-4 py-3 text-right">
                                                    {renderChangeBadge(type.data.cpcChangePct, 'cost', type.data.prevCPC, (v) => `$${v.toFixed(1)}`)}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-right text-sm font-bold text-white">{type.data.totalConversions.toLocaleString()}</td>
                                            {showComparison && (
                                                <td className="px-4 py-3 text-right">
                                                    {renderChangeBadge(type.data.conversionsChangePct, 'performance', type.data.prevConversions, (v) => v.toLocaleString())}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-right text-sm font-bold text-white">${type.data.avgCPA.toFixed(1)}</td>
                                            {showComparison && (
                                                <td className="px-4 py-3 text-right">
                                                    {renderChangeBadge(type.data.cpaChangePct, 'cost', type.data.prevCPA, (v) => `$${v.toFixed(1)}`)}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                        </tbody>
                        {/* Total Row */}
                        <tfoot>
                            {(() => {
                                const total = {
                                    spend: formatMetrics.broad.totalSpend + formatMetrics.lookalike.totalSpend + formatMetrics.interest.totalSpend + formatMetrics.custom.totalSpend,
                                    conversions: formatMetrics.broad.totalConversions + formatMetrics.lookalike.totalConversions + formatMetrics.interest.totalConversions + formatMetrics.custom.totalConversions,
                                    clicks: formatMetrics.broad.totalClicks + formatMetrics.lookalike.totalClicks + formatMetrics.interest.totalClicks + formatMetrics.custom.totalClicks,
                                    count: formatMetrics.broad.count + formatMetrics.lookalike.count + formatMetrics.interest.count + formatMetrics.custom.count,
                                    prevSpend: (formatMetrics.broad.prevSpend || 0) + (formatMetrics.lookalike.prevSpend || 0) + (formatMetrics.interest.prevSpend || 0) + (formatMetrics.custom.prevSpend || 0),
                                    prevConversions: (formatMetrics.broad.prevConversions || 0) + (formatMetrics.lookalike.prevConversions || 0) + (formatMetrics.interest.prevConversions || 0) + (formatMetrics.custom.prevConversions || 0),
                                };
                                // Calculate weighted CTR and CPC from all adsets
                                const adsetsToAnalyze = isFilterActive && filteredAdsetIds.length > 0
                                    ? targetingData.filter(a => filteredAdsetIds.includes(a.adset_id))
                                    : targetingData;
                                const totalImpressions = adsetsToAnalyze.reduce((sum, a) => sum + a.impressions, 0);
                                const totalCTR = totalImpressions > 0 ? (total.clicks / totalImpressions) * 100 : 0;
                                const totalCPC = total.clicks > 0 ? total.spend / total.clicks : 0;
                                const totalCPA = total.conversions > 0 ? total.spend / total.conversions : 0;

                                // Previous period totals
                                const prevClicks = adsetsToAnalyze.reduce((sum, a) => sum + (a.previous_clicks || 0), 0);
                                const prevImpressions = adsetsToAnalyze.reduce((sum, a) => sum + (a.previous_impressions || 0), 0);
                                const prevCTR = prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0;
                                const prevCPC = prevClicks > 0 ? total.prevSpend / prevClicks : 0;
                                const prevCPA = total.prevConversions > 0 ? total.prevSpend / total.prevConversions : 0;

                                const hasPrevData = total.prevSpend > 0 || prevClicks > 0;
                                const calcChange = (current: number, previous: number) => {
                                    if (previous === 0) return current > 0 ? 100 : null;
                                    return ((current - previous) / previous) * 100;
                                };

                                const spendChangePct = hasPrevData ? calcChange(total.spend, total.prevSpend) : null;
                                const ctrChangePct = hasPrevData ? calcChange(totalCTR, prevCTR) : null;
                                const cpcChangePct = hasPrevData ? calcChange(totalCPC, prevCPC) : null;
                                const conversionsChangePct = hasPrevData ? calcChange(total.conversions, total.prevConversions) : null;
                                const cpaChangePct = hasPrevData ? calcChange(totalCPA, prevCPA) : null;

                                const renderChangeBadge = (changePct: number | null, metricType: 'cost' | 'performance' | 'neutral', prevValue?: number | null, formatter?: (v: number) => string) => {
                                    if (changePct === null || changePct === undefined) return <span className="text-gray-500 text-sm">-</span>;
                                    const isPositive = changePct > 0;
                                    const isNegative = changePct < 0;
                                    let colorClass = 'text-gray-400'; // neutral
                                    if (metricType === 'cost') {
                                        colorClass = isNegative ? 'text-green-400' : 'text-red-400';
                                    } else if (metricType === 'performance') {
                                        colorClass = isPositive ? 'text-green-400' : 'text-red-400';
                                    }
                                    const Icon = isPositive ? TrendingUp : TrendingDown;
                                    const tooltip = prevValue !== null && prevValue !== undefined && formatter
                                        ? `Previous: ${formatter(prevValue)}` : undefined;
                                    return (
                                        <div className={`inline-flex items-center gap-1 text-xs font-medium ${colorClass} cursor-help`} title={tooltip}>
                                            <Icon className="w-3 h-3" />
                                            <span>{Math.abs(changePct).toFixed(1)}%</span>
                                        </div>
                                    );
                                };

                                return (
                                    <tr className="border-t-2 border-border-subtle bg-white/[0.03]">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-white">Total</span>
                                                <span className="text-xs text-gray-500">({total.count})</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-white">${Math.round(total.spend).toLocaleString()}</td>
                                        {showComparison && (
                                            <td className="px-4 py-3 text-right">
                                                {renderChangeBadge(spendChangePct, 'neutral', total.prevSpend, (v) => `$${Math.round(v).toLocaleString()}`)}
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-right text-sm font-bold text-white">{totalCTR.toFixed(2)}%</td>
                                        {showComparison && (
                                            <td className="px-4 py-3 text-right">
                                                {renderChangeBadge(ctrChangePct, 'performance', prevCTR, (v) => `${v.toFixed(2)}%`)}
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-right text-sm font-bold text-white">${totalCPC.toFixed(1)}</td>
                                        {showComparison && (
                                            <td className="px-4 py-3 text-right">
                                                {renderChangeBadge(cpcChangePct, 'cost', prevCPC, (v) => `$${v.toFixed(1)}`)}
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-right text-sm font-bold text-white">{total.conversions.toLocaleString()}</td>
                                        {showComparison && (
                                            <td className="px-4 py-3 text-right">
                                                {renderChangeBadge(conversionsChangePct, 'performance', total.prevConversions, (v) => v.toLocaleString())}
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-right text-sm font-bold text-white">${totalCPA.toFixed(1)}</td>
                                        {showComparison && (
                                            <td className="px-4 py-3 text-right">
                                                {renderChangeBadge(cpaChangePct, 'cost', prevCPA, (v) => `$${v.toFixed(1)}`)}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })()}
                        </tfoot>
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
                    showComparison={showComparison}
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
            <div className="mb-8" ref={breakdownRef}>
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
                    isVisible={isBreakdownVisible}
                />
            </div>
        </MainLayout>
    );
}
