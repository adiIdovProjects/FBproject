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
    <div className="inline-flex rounded-lg border border-border-subtle bg-secondary p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
            ${selected === option.value
              ? 'bg-accent text-accent-text shadow-md'
              : 'text-text-muted hover:text-foreground hover:bg-secondary-hover'
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
