"use client";

/**
 * TimeGranularityToggle Component
 * Toggle between Day, Week, and Month time granularity
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { TimeGranularity } from '../../types/campaigns.types';

interface TimeGranularityToggleProps {
  selected: TimeGranularity;
  onChange: (granularity: TimeGranularity) => void;
  isRTL?: boolean;
}

export const TimeGranularityToggle: React.FC<TimeGranularityToggleProps> = ({
  selected,
  onChange,
  isRTL = false,
}) => {
  const t = useTranslations();
  const options: { value: TimeGranularity; label: string }[] = [
    { value: 'day', label: t('time.day') || 'Day' },
    { value: 'week', label: t('time.week') || 'Week' },
    { value: 'month', label: t('time.month') || 'Month' },
  ];

  return (
    <div className={`inline-flex rounded-lg border border-gray-600 bg-gray-700 p-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
            ${selected === option.value
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default TimeGranularityToggle;
