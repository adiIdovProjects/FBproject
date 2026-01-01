/**
 * InsightsSection Component
 * Reusable section for displaying categorized insights with icons
 */

import React from 'react';
import { InsightItem } from '../../services/insights.service';

interface InsightsSectionProps {
  title: string;
  items?: InsightItem[];
  isRTL?: boolean;
}

export default function InsightsSection({ title, items, isRTL = false }: InsightsSectionProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className={`text-xl font-bold text-gray-100 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        {title}
      </h2>
      <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-6">
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'flex-row'}`}
            >
              <span className="text-2xl flex-shrink-0 mt-1">{item.icon}</span>
              <div className="flex-1">
                <p className="text-gray-200 leading-relaxed">{item.text}</p>
                {item.priority && (
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                      item.priority === 'high'
                        ? 'bg-red-900/40 text-red-300 border border-red-700'
                        : item.priority === 'medium'
                        ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-700'
                        : 'bg-blue-900/40 text-blue-300 border border-blue-700'
                    }`}
                  >
                    {item.priority === 'high' ? '🔴 High Priority' : item.priority === 'medium' ? '🟡 Medium' : '🔵 Low'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
