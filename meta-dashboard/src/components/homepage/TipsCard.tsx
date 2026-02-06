"use client";

/**
 * Tips Card - Simple recommendations for homepage
 * Shows 1-2 actionable tips based on account data
 */

import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Lightbulb, Rocket, Video, Image, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';
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

export default function TipsCard({ className = '' }: TipsCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { selectedAccountId } = useAccount();

  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['tips-recommendations', selectedAccountId],
    queryFn: () => fetchRecommendations(selectedAccountId?.toString()),
    enabled: !!selectedAccountId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 1,
  });

  const handleBuildReport = () => {
    router.push(`/${locale}/my-reports`);
  };

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
          {t('my_report.todays_tips') || "Today's Tips"}
        </h3>
      </div>

      {/* Tips List */}
      <div className="space-y-3 mb-4">
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
            <div key={idx} className="flex items-start gap-3">
              <div className="p-2 bg-gray-800/50 rounded-lg shrink-0">
                {ICON_MAP[rec.icon] || <Lightbulb className="w-4 h-4 text-gray-400" />}
              </div>
              <p className="text-sm text-gray-300 leading-relaxed pt-1">
                {rec.message}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Build Report Link */}
      <button
        onClick={handleBuildReport}
        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
      >
        <span>{t('my_report.build_my_report') || 'Build My Report'}</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
