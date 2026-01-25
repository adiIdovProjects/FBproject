"use client";

/**
 * TopCreatives Component
 * Shows top 3 performing creatives with thumbnails and simple metrics
 */

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, Text } from '@tremor/react';
import { ChevronRight, Loader2, Image, Video, Layers, TrendingUp } from 'lucide-react';
import { fetchCreatives } from '../../services/creatives.service';
import { formatDate, calculateDateRange } from '../../utils/date';
import { CreativeMetrics } from '../../types/creatives.types';

interface TopCreativesProps {
  accountId: string | null;
  startDate?: string | null;
  endDate?: string | null;
  showConversions?: boolean; // If true, shows "Conversions" instead of "Results"
}

const TopCreatives: React.FC<TopCreativesProps> = ({ accountId, startDate: propStartDate, endDate: propEndDate, showConversions = false }) => {
  const t = useTranslations();
  const locale = useLocale();

  // Use props if provided, otherwise default to last 30 days
  const dateRange = calculateDateRange('last_30_days');
  const startDate = propStartDate || formatDate(dateRange.start) || '';
  const endDate = propEndDate || formatDate(dateRange.end) || '';

  const { data: creatives, isLoading } = useQuery({
    queryKey: ['homepage-creatives', startDate, endDate, accountId],
    queryFn: () => fetchCreatives(
      {
        dateRange: { startDate, endDate },
        sort_by: 'conversions', // Sort by best performing
        min_spend: 1, // Only show creatives with some spend
      },
      accountId
    ),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });

  // Take top 3 by conversions
  const topCreatives = creatives?.slice(0, 3) || [];

  // Get creative type icon
  const getTypeIcon = (creative: CreativeMetrics) => {
    if (creative.is_carousel) return Layers;
    if (creative.is_video) return Video;
    return Image;
  };

  // Format number compactly
  const formatCompact = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <Card className="card-gradient border-border-subtle mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          <Text className="text-white font-bold text-lg">{t('homepage.creatives.title')}</Text>
        </div>
        <Link
          href={`/${locale}/creatives`}
          className="text-accent text-sm hover:underline flex items-center gap-1"
        >
          {t('homepage.creatives.view_all')}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : topCreatives.length === 0 ? (
        <div className="text-center py-8">
          <Text className="text-gray-500">{t('homepage.creatives.no_creatives')}</Text>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {topCreatives.map((creative, index) => {
            const TypeIcon = getTypeIcon(creative);
            const thumbnail = creative.image_url || creative.video_url;
            const title = creative.title || `Creative #${creative.creative_id}`;

            return (
              <div
                key={creative.creative_id}
                className="bg-white/5 rounded-xl p-3 border border-white/5 hover:border-accent/30 transition-all"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800 mb-3">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <TypeIcon className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  {/* Type badge */}
                  <div className="absolute top-2 right-2 p-1 rounded bg-black/50">
                    <TypeIcon className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Title */}
                <Text className="text-white text-sm font-medium truncate mb-2">
                  {title}
                </Text>

                {/* Simple metrics */}
                <div className="flex items-center justify-between text-xs">
                  <div className="text-gray-400">
                    <span className="text-green-400 font-semibold">{formatCompact(creative.conversions)}</span>
                    {' '}{showConversions ? t('metrics.conversions') : t('homepage.creatives.results_label')}
                  </div>
                  <div className="text-gray-500">
                    {creative.ctr.toFixed(1)}% CTR
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default TopCreatives;
