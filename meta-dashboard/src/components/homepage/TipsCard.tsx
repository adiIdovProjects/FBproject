"use client";

/**
 * Tips Card - Simple recommendations for homepage
 * Shows 1-2 actionable tips based on account data
 * Includes expandable "Why?" explanations for beginners
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Lightbulb, Rocket, Video, Image, DollarSign, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchRecommendations, Recommendation } from '@/services/reports.service';
import { useAccount } from '@/context/AccountContext';

interface TipsCardProps {
  className?: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  rocket: <Rocket className="w-4 h-4 text-blue-400" />,
  video: <Video className="w-4 h-4 text-purple-400" />,
  image: <Image className="w-4 h-4 text-green-400" />,
  dollar: <DollarSign className="w-4 h-4 text-yellow-400" />,
  trending_up: <TrendingUp className="w-4 h-4 text-cyan-400" />,
};

// Individual recommendation with expandable "Why?" section
function RecommendationItem({ rec }: { rec: Recommendation }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = useTranslations();

  return (
    <div className="group">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gray-800/50 rounded-lg shrink-0">
          {ICON_MAP[rec.icon] || <Lightbulb className="w-4 h-4 text-gray-400" />}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-300 leading-relaxed pt-1">
            {rec.message}
          </p>
          {/* "Why?" toggle button - shows if reason exists */}
          {rec.reason && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 mt-1.5 text-xs text-accent hover:text-accent/80 transition-colors"
            >
              <span>{t('recommendations.why') || 'Why?'}</span>
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>
      {/* Expanded "Why?" explanation */}
      {isExpanded && rec.reason && (
        <div className="ml-12 mt-2 p-2.5 bg-gray-800/30 rounded-lg border-l-2 border-accent/30">
          <p className="text-xs text-gray-400 leading-relaxed">
            {rec.reason}
          </p>
        </div>
      )}
    </div>
  );
}

export default function TipsCard({ className = '' }: TipsCardProps) {
  const t = useTranslations();
  const { selectedAccountId } = useAccount();

  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['tips-recommendations', selectedAccountId],
    queryFn: () => fetchRecommendations(selectedAccountId?.toString()),
    enabled: !!selectedAccountId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 1,
  });

  // Don't show card if no recommendations or error
  if (error || (!isLoading && (!recommendations || recommendations.length === 0))) {
    return null;
  }

  return (
    <div className={`bg-card-bg/40 border border-border-subtle rounded-2xl p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-yellow-500/10 rounded-lg">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">
          {t('recommendations.title') || "Recommendations"}
        </h3>
      </div>

      {/* Recommendations List */}
      <div className="space-y-3">
        {isLoading ? (
          // Loading skeleton
          <>
            <div className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-700 rounded-lg" />
              <div className="flex-1 h-4 bg-gray-700 rounded" />
            </div>
            <div className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-700 rounded-lg" />
              <div className="flex-1 h-4 bg-gray-700 rounded" />
            </div>
          </>
        ) : (
          recommendations?.map((rec: Recommendation, idx: number) => (
            <RecommendationItem key={idx} rec={rec} />
          ))
        )}
      </div>

    </div>
  );
}
