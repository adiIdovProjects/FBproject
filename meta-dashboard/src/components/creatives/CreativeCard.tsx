import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, Text, Badge } from '@tremor/react';
import { Play, DollarSign, TrendingUp, MousePointer, Target, Zap } from 'lucide-react';
import { CreativeMetrics } from '../../types/creatives.types';

interface CreativeCardProps {
    creative: CreativeMetrics;
    currency?: string;
}

export const CreativeCard: React.FC<CreativeCardProps> = ({
    creative,
    currency = 'USD',
}) => {
    const t = useTranslations();

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0,
        }).format(val);
    };

    const getStatusColor = (status: string): "emerald" | "yellow" | "gray" => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE': return 'emerald';
            case 'PAUSED': return 'yellow';
            case 'ARCHIVED': return 'gray';
            default: return 'gray';
        }
    };

    const getStatusTranslationKey = (status: string): string => {
        return `status.${status}`;
    };

    const getStatusClassName = (status: string): string => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE':
                return 'bg-emerald-500/20 text-emerald-400';
            case 'PAUSED':
                return 'bg-yellow-500/20 text-yellow-400';
            case 'ARCHIVED':
                return 'bg-gray-500/20 text-text-muted';
            default:
                return 'bg-gray-500/20 text-text-muted';
        }
    };

    const handleMediaClick = () => {
        if (creative.video_url) {
            window.open(creative.video_url, '_blank');
        }
    };

    return (
        <Card className="bg-[#111827]/80 backdrop-blur-md border-gray-800/50 overflow-hidden group hover:border-indigo-500/50 transition-all duration-300 p-0 rounded-2xl">
            {/* Media Area */}
            <div
                className={`relative aspect-[4/5] bg-card overflow-hidden cursor-pointer`}
                onClick={handleMediaClick}
            >
                {creative.image_url ? (
                    <img
                        src={creative.image_url}
                        alt={creative.title || 'Creative'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                        <Zap className="w-12 h-12 opacity-20" />
                    </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 left-3 flex gap-2">
                    <Badge
                        size="xs"
                        color={getStatusColor(creative.effective_status)}
                        className={`${getStatusClassName(creative.effective_status)} border-none px-2 py-0.5 rounded-md font-medium`}
                    >
                        {t(getStatusTranslationKey(creative.effective_status))}
                    </Badge>
                    {creative.is_carousel && (
                        <Badge size="xs" color="purple" className="bg-purple-500/20 text-purple-400 border-none px-2 py-0.5 rounded-md font-medium">
                            Carousel
                        </Badge>
                    )}
                </div>

                {/* Video Duration Badge */}
                {creative.is_video && (
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded border border-border-subtle font-medium">
                        {creative.video_length_seconds ? `0:${creative.video_length_seconds.toString().padStart(2, '0')}` : 'Video'}
                    </div>
                )}

                {/* Play Button Overlay */}
                {creative.is_video && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-60 group-hover:opacity-90 transition-opacity">
                        <div className="bg-white/20 backdrop-blur-md rounded-full p-3 border border-white/30">
                            <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                    </div>
                )}

                {/* Score / Warning Icons (as seen in image) */}
                <div className="absolute bottom-3 right-3 flex gap-2">
                    <div className="bg-indigo-500/80 rounded-full p-1 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center">
                        9.8
                    </div>
                </div>
            </div>

            {/* Info Area */}
            <div className="p-4 bg-gradient-to-b from-[#111827] to-[#0f172a]">
                <div className="flex justify-between items-start mb-3">
                    <h4 className="text-sm font-semibold text-foreground truncate pr-2 w-full" title={creative.title}>
                        {creative.title || t('common.search').replace('...', '')}
                    </h4>
                    <button className="text-text-muted hover:text-foreground">
                        <Text className="font-bold">...</Text>
                    </button>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                    {/* Item 1: Spend */}
                    <div className="space-y-0.5">
                        <div className="flex items-center text-[10px] text-text-muted font-medium uppercase tracking-wider">
                            <DollarSign className="w-2.5 h-2.5 mr-1 text-text-muted" />
                            {t('metrics.spend')}
                        </div>
                        <div className="text-sm font-bold text-foreground">{formatCurrency(creative.spend)}</div>
                    </div>

                    {/* Item 2: ROAS - Only show if there is conversion value */}
                    {(creative.conversion_value || 0) > 0 && (
                        creative.conversions > 0 ? (
                            <div className="space-y-0.5">
                                <div className="flex items-center text-[10px] text-text-muted font-medium uppercase tracking-wider">
                                    <TrendingUp className="w-2.5 h-2.5 mr-1 text-text-muted" />
                                    {t('metrics.roas')}
                                </div>
                                <div className="text-sm font-bold text-indigo-400">{(creative.roas || 0).toFixed(1)}x</div>
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                <div className="flex items-center text-[10px] text-text-muted font-medium uppercase tracking-wider">
                                    <TrendingUp className="w-2.5 h-2.5 mr-1 text-text-muted" />
                                    {t('metrics.roas')}
                                </div>
                                <div className="text-sm font-bold text-text-muted italic">N/A</div>
                            </div>
                        )
                    )}

                    {/* Item 3: CPA */}
                    {creative.conversions > 0 ? (
                        <div className="space-y-0.5">
                            <div className="flex items-center text-[10px] text-text-muted font-medium uppercase tracking-wider">
                                <Target className="w-2.5 h-2.5 mr-1 text-text-muted" />
                                {t('metrics.cpa')}
                            </div>
                            <div className="text-sm font-bold text-foreground">{formatCurrency(creative.cpa)}</div>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            <div className="flex items-center text-[10px] text-text-muted font-medium uppercase tracking-wider">
                                <Target className="w-2.5 h-2.5 mr-1 text-text-muted" />
                                {t('metrics.cpa')}
                            </div>
                            <div className="text-sm font-bold text-text-muted italic">N/A</div>
                        </div>
                    )}
                    Suggesting "N/A" rather than hiding entirely to maintain grid consistency in CreativeCard.

                    {/* Item 4: CTR */}
                    <div className="space-y-0.5">
                        <div className="flex items-center text-[10px] text-text-muted font-medium uppercase tracking-wider">
                            <MousePointer className="w-2.5 h-2.5 mr-1 text-text-muted" />
                            {t('metrics.ctr')}
                        </div>
                        <div className="text-sm font-bold text-foreground">{(creative.ctr || 0).toFixed(2)}%</div>
                    </div>

                    {/* Video Metrics */}
                    {creative.is_video && (
                        <>
                            {/* Thumbstop (Hook Rate) */}
                            <div className="space-y-0.5">
                                <div className="flex items-center text-[10px] text-text-muted font-medium uppercase tracking-wider">
                                    <Zap className="w-2.5 h-2.5 mr-1 text-text-muted" />
                                    {t('creatives.hook_rate')}
                                </div>
                                <div className="text-sm font-bold text-blue-400">{(creative.hook_rate || 0).toFixed(1)}%</div>
                            </div>

                            {/* Hold Rate */}
                            <div className="space-y-0.5">
                                <div className="flex items-center text-[10px] text-text-muted font-medium uppercase tracking-wider">
                                    <Play className="w-2.5 h-2.5 mr-1 text-text-muted" />
                                    {t('creatives.hold_rate')}
                                </div>
                                <div className="text-sm font-bold text-emerald-400">{(creative.hold_rate || 0).toFixed(1)}%</div>
                            </div>

                            {/* Completion & Watch Time row */}
                            <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-gray-800/50 mt-1">
                                <div className="space-y-0.5">
                                    <div className="flex items-center text-[10px] text-text-muted font-medium uppercase tracking-wider">
                                        <TrendingUp className="w-2.5 h-2.5 mr-1 text-text-muted" />
                                        {t('creatives.avg_completion')}
                                    </div>
                                    <div className="text-xs font-bold text-foreground">{(creative.completion_rate || 0).toFixed(1)}%</div>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex items-center text-[10px] text-text-muted font-medium uppercase tracking-wider">
                                        <Play className="w-2.5 h-2.5 mr-1 text-text-muted" />
                                        {t('creatives.avg_watch_time')}
                                    </div>
                                    <div className="text-xs font-bold text-foreground">
                                        {creative.video_length_seconds && creative.video_length_seconds > 0
                                            ? `${((creative.avg_watch_time || 0) / creative.video_length_seconds * 100).toFixed(1)}%`
                                            : `${(creative.avg_watch_time || 0).toFixed(1)}s`
                                        }
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default CreativeCard;
