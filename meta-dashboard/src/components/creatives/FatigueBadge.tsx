"use client";

/**
 * FatigueBadge Component
 * Displays ad fatigue severity with color-coded badges
 */

import React from 'react';
import { AlertTriangle, TrendingDown, Eye, CheckCircle } from 'lucide-react';

interface FatigueBadgeProps {
  severity?: string | null;
  ctrDeclinePct?: number | null;
  daysActive?: number | null;
}

export const FatigueBadge: React.FC<FatigueBadgeProps> = ({
  severity,
  ctrDeclinePct,
  daysActive,
}) => {
  if (!severity || severity === 'none') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border bg-gray-900/30 text-gray-400 border-gray-600">
        <CheckCircle className="w-3 h-3" />
        <span className="text-xs font-medium">Healthy</span>
      </div>
    );
  }

  // Determine badge styling based on severity
  let bgColor = '';
  let textColor = '';
  let borderColor = '';
  let label = '';
  let Icon = Eye;

  switch (severity) {
    case 'low':
      bgColor = 'bg-yellow-900/30';
      textColor = 'text-yellow-400';
      borderColor = 'border-yellow-600';
      label = 'Monitor';
      Icon = Eye;
      break;
    case 'medium':
      bgColor = 'bg-orange-900/30';
      textColor = 'text-orange-400';
      borderColor = 'border-orange-600';
      label = 'Warning';
      Icon = TrendingDown;
      break;
    case 'high':
      bgColor = 'bg-red-900/30';
      textColor = 'text-red-400';
      borderColor = 'border-red-600';
      label = 'Urgent';
      Icon = AlertTriangle;
      break;
    default:
      return null;
  }

  // Build tooltip text
  const tooltipText = ctrDeclinePct !== null && ctrDeclinePct !== undefined
    ? `CTR declined ${Math.abs(ctrDeclinePct).toFixed(1)}% over ${daysActive || 0} days`
    : 'Ad fatigue detected';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${bgColor} ${textColor} ${borderColor} cursor-help`}
      title={tooltipText}
    >
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
};

export default FatigueBadge;
