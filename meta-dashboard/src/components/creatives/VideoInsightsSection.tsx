/**
 * VideoInsightsSection Component
 * Displays aggregated video performance patterns and specific insights
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, Grid, Col, Text, Metric, List, ListItem, Badge, Callout } from '@tremor/react';
import { Lightbulb, CheckCircle2, AlertCircle } from 'lucide-react';
import { VideoInsightsResponse } from '../../types/creatives.types';

interface VideoInsightsSectionProps {
    data: VideoInsightsResponse;
    isLoading?: boolean;
}

export const VideoInsightsSection: React.FC<VideoInsightsSectionProps> = ({
    data,
    isLoading = false,
}) => {
    const t = useTranslations();
    if (isLoading) {
        return (
            <Card className="bg-gray-800 border-gray-700 animate-pulse h-64">
                <div className="h-6 w-48 bg-gray-700 rounded mb-4"></div>
                <div className="space-y-4">
                    <div className="h-4 w-full bg-gray-700 rounded"></div>
                    <div className="h-4 w-5/6 bg-gray-700 rounded"></div>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overview Stats */}
            <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
                <Card className="bg-gray-800 border-gray-700" decoration="left" decorationColor="indigo">
                    <Text className="text-gray-400">{t('extracted_avg_hook_rate')}</Text>
                    <Metric className="text-indigo-400">{data.average_hook_rate.toFixed(1)}%</Metric>
                </Card>
                <Card className="bg-gray-800 border-gray-700" decoration="left" decorationColor="green">
                    <Text className="text-gray-400">{t('extracted_avg_completion')}</Text>
                    <Metric className="text-green-400">{data.average_completion_rate.toFixed(1)}%</Metric>
                </Card>
                <Card className="bg-gray-800 border-gray-700" decoration="left" decorationColor="blue">
                    <Text className="text-gray-400">{t('extracted_avg_hold_rate')}</Text>
                    <Metric className="text-blue-400">{data.average_hold_rate.toFixed(1)}%</Metric>
                </Card>
                <Card className="bg-gray-800 border-gray-700" decoration="left" decorationColor="purple">
                    <Text className="text-gray-400">{t('extracted_avg_video_time')}</Text>
                    <Metric className="text-purple-400">{data.average_video_time.toFixed(1)}s</Metric>
                </Card>
            </Grid>

            {/* Pattern Insights */}
            <Card className="bg-gray-800 border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                    <h3 className="text-xl font-bold text-gray-100">{t('extracted_video_patterns_discovered')}</h3>
                </div>

                <div className="space-y-4">
                    {data.insights.map((insight, idx) => (
                        <Callout
                            key={idx}
                            title={insight.confidence > 0.8 ? "High Confidence Pattern" : "Potential Insight"}
                            icon={insight.confidence > 0.8 ? CheckCircle2 : AlertCircle}
                            color={insight.confidence > 0.8 ? "emerald" : "amber"}
                            className="bg-gray-900/40 border-gray-700"
                        >
                            {insight.message}
                        </Callout>
                    ))}

                    {data.insights.length === 0 && (
                        <Text className="text-gray-500 italic">{t('extracted_no_significant_video_patterns_detected_for_this_period')}</Text>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default VideoInsightsSection;
