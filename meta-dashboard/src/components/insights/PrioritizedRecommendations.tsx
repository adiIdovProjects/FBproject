/**
 * PrioritizedRecommendations Component
 * Displays recommendations grouped by priority with visual hierarchy
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { InsightItem } from '../../services/insights.service';

interface PrioritizedRecommendationsProps {
  items?: InsightItem[];
  isRTL?: boolean;
}

export default function PrioritizedRecommendations({ items, isRTL = false }: PrioritizedRecommendationsProps) {
  const t = useTranslations();

  if (!items || items.length === 0) {
    return null;
  }

  // Group by priority
  const highPriority = items.filter(item => item.priority === 'high');
  const mediumPriority = items.filter(item => item.priority === 'medium');
  const lowPriority = items.filter(item => item.priority === 'low' || !item.priority);

  return (
    <div className="mb-8">
      <h2 className={`text-xl font-bold text-gray-100 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t('insights.strategic_recommendations')}
      </h2>

      <div className="grid gap-6">
        {/* High Priority */}
        {highPriority.length > 0 && (
          <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-xl p-6">
            <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className="text-2xl">🚀</span>
              <h3 className="text-lg font-semibold text-red-200">{t('insights.high_priority')}</h3>
            </div>
            <div className="space-y-3">
              {highPriority.map((item, idx) => (
                <div key={idx} className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : 'flex-row'}`}>
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <p className="text-gray-200 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medium Priority */}
        {mediumPriority.length > 0 && (
          <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30 border border-yellow-500/30 rounded-xl p-6">
            <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className="text-2xl">🎯</span>
              <h3 className="text-lg font-semibold text-yellow-200">{t('insights.medium_priority')}</h3>
            </div>
            <div className="space-y-3">
              {mediumPriority.map((item, idx) => (
                <div key={idx} className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : 'flex-row'}`}>
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <p className="text-gray-200 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test & Learn */}
        {lowPriority.length > 0 && (
          <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-blue-500/30 rounded-xl p-6">
            <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className="text-2xl">💡</span>
              <h3 className="text-lg font-semibold text-blue-200">{t('insights.test_and_learn')}</h3>
            </div>
            <div className="space-y-3">
              {lowPriority.map((item, idx) => (
                <div key={idx} className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : 'flex-row'}`}>
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <p className="text-gray-200 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
