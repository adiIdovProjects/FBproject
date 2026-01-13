"use client";

/**
 * Campaign Analysis View Component
 * Displays campaign portfolio analysis categorized by AI (Scale, Maintain, Fix)
 */

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Target, TrendingUp, AlertCircle, TrendingDown, DollarSign, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
    fetchCampaignAnalysis,
    CampaignAnalysisResponse
} from '../../services/insights.service';

interface CampaignAnalysisViewProps {
    startDate: string;
    endDate: string;
    isRTL: boolean;
    accountId?: string;
}

export default function CampaignAnalysisView({
    startDate,
    endDate,
    isRTL,
    accountId
}: CampaignAnalysisViewProps) {
    const locale = useLocale();
    const [data, setData] = useState<CampaignAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const result = await fetchCampaignAnalysis({ startDate, endDate }, accountId, locale);
                setData(result);
            } catch (err: any) {
                console.error('[Campaign Analysis] Error:', err);
                setError(err.message || 'Failed to load campaign analysis');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [startDate, endDate, accountId]);

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
                        <div className="h-6 w-48 bg-gray-700 rounded animate-pulse mb-4"></div>
                        <div className="space-y-3">
                            {[...Array(3)].map((_, j) => (
                                <div key={j} className="h-4 bg-gray-700 rounded animate-pulse"></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-red-900/50 border border-red-400 text-red-300 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <p className="font-bold">Error Loading Campaign Analysis</p>
                </div>
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    // No data state
    if (!data) {
        return (
            <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No campaign data available</p>
            </div>
        );
    }

    const renderCampaignTable = (campaigns: any[], title: string, icon: React.ReactNode, type: 'scale' | 'fix' | 'maintain') => {
        if (!campaigns || campaigns.length === 0) return null;

        let borderColor = 'border-border-subtle';
        let titleColor = 'text-gray-100';
        if (type === 'scale') {
            borderColor = 'border-green-500/30';
            titleColor = 'text-green-400';
        } else if (type === 'fix') {
            borderColor = 'border-red-500/30';
            titleColor = 'text-red-400';
        }

        return (
            <div className={`bg-card-bg/40 border ${borderColor} rounded-xl p-6 mb-6`}>
                <div className="flex items-center gap-2 mb-4">
                    {icon}
                    <h3 className={`text-lg font-bold ${titleColor}`}>{title}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border-subtle">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Campaign</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Spend</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">ROAS</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">CPA</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Conv</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.map((c, idx) => (
                                <tr key={idx} className="border-b border-border-subtle/50 hover:bg-card-bg/60">
                                    <td className="py-3 px-4 text-sm font-medium">{c.name}</td>
                                    <td className="py-3 px-4 text-sm text-right">${(c.spend || 0).toFixed(2)}</td>
                                    <td className={`py-3 px-4 text-sm text-right font-bold ${(c.roas || 0) > 2 ? 'text-green-400' : (c.roas || 0) < 1 ? 'text-red-400' : 'text-yellow-400'}`}>{(c.roas || 0).toFixed(2)}x</td>
                                    <td className="py-3 px-4 text-sm text-right">${(c.cpa || 0).toFixed(2)}</td>
                                    <td className="py-3 px-4 text-sm text-right">{c.conversions || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* AI Analysis Card */}
            <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border border-blue-500/30 rounded-xl p-6 shadow-lg">
                <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Activity className="w-6 h-6 text-blue-400" />
                    <h2 className="text-2xl font-bold text-blue-200">Portfolio Optimization Strategy</h2>
                </div>
                <div className={`prose prose-invert max-w-none ${isRTL ? 'text-right' : 'text-left'}`}>
                    <ReactMarkdown>{data.analysis}</ReactMarkdown>
                </div>
            </div>

            {/* Campaign Categories */}
            {data.data && (
                <>
                    {renderCampaignTable(
                        data.data.scale_candidates,
                        "🚀 Candidates for Scaling (High ROAS)",
                        <TrendingUp className="w-5 h-5 text-green-400" />,
                        'scale'
                    )}

                    {renderCampaignTable(
                        data.data.fix_candidates,
                        "⚠️ Candidates for Refactoring (Low Efficiency)",
                        <AlertCircle className="w-5 h-5 text-red-400" />,
                        'fix'
                    )}

                    {/* Total Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-card-bg/60 border border-border-subtle rounded-xl p-4">
                            <div className="text-sm text-gray-400 mb-1">Total Campaigns</div>
                            <div className="text-2xl font-bold">{data.data.total_analyzed}</div>
                        </div>
                        <div className="bg-card-bg/60 border border-border-subtle rounded-xl p-4">
                            <div className="text-sm text-gray-400 mb-1">Scale Candidates</div>
                            <div className="text-2xl font-bold text-green-400">{data.data.scale_candidates?.length || 0}</div>
                        </div>
                        <div className="bg-card-bg/60 border border-border-subtle rounded-xl p-4">
                            <div className="text-sm text-gray-400 mb-1">Fix Candidates</div>
                            <div className="text-2xl font-bold text-red-400">{data.data.fix_candidates?.length || 0}</div>
                        </div>
                    </div>
                </>
            )}

            {/* Metadata */}
            {data.metadata && (
                <div className="text-center text-xs text-gray-500 mt-8">
                    ✨ Analyzed {startDate} to {endDate} • Generated at{' '}
                    {new Date(data.metadata.generated_at).toLocaleString()}
                </div>
            )}
        </div>
    );
}
