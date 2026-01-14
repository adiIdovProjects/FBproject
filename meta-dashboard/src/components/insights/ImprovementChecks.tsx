"use client";

/**
 * ImprovementChecks Component
 * Shows learning phase status, pixel health, and other improvement recommendations
 */

import { ImprovementCheck } from '../../services/insights.service';
import { CheckCircle, AlertTriangle, AlertCircle, PartyPopper, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ImprovementChecksProps {
  checks: ImprovementCheck[];
  isRTL: boolean;
  title?: string;
}

const statusStyles = {
  excellent: {
    bg: 'bg-green-900/20',
    border: 'border-green-500/30',
    text: 'text-green-300',
    icon: PartyPopper,
    iconColor: 'text-green-400'
  },
  good: {
    bg: 'bg-blue-900/20',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    icon: CheckCircle,
    iconColor: 'text-blue-400'
  },
  warning: {
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-300',
    icon: AlertTriangle,
    iconColor: 'text-yellow-400'
  },
  critical: {
    bg: 'bg-red-900/20',
    border: 'border-red-500/30',
    text: 'text-red-300',
    icon: AlertCircle,
    iconColor: 'text-red-400'
  }
};

export default function ImprovementChecks({ checks, isRTL, title }: ImprovementChecksProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!checks || checks.length === 0) {
    return null;
  }

  // Sort: critical first, then warning, then good, then excellent
  const sortedChecks = [...checks].sort((a, b) => {
    const order = { critical: 0, warning: 1, good: 2, excellent: 3 };
    return (order[a.status] || 4) - (order[b.status] || 4);
  });

  // Count by status
  const statusCounts = {
    excellent: checks.filter(c => c.status === 'excellent').length,
    good: checks.filter(c => c.status === 'good').length,
    warning: checks.filter(c => c.status === 'warning').length,
    critical: checks.filter(c => c.status === 'critical').length
  };

  return (
    <div className="bg-card-bg/40 border border-border-subtle rounded-xl p-4 mb-6">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="font-semibold text-gray-200">
            {title || 'What Can Be Improved?'}
          </h3>
          {/* Status badges */}
          <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {statusCounts.critical > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-900/50 text-red-300">
                {statusCounts.critical}
              </span>
            )}
            {statusCounts.warning > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-900/50 text-yellow-300">
                {statusCounts.warning}
              </span>
            )}
            {statusCounts.excellent > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-900/50 text-green-300">
                {statusCounts.excellent}
              </span>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="mt-4 space-y-2">
          {sortedChecks.map((check, index) => {
            const style = statusStyles[check.status] || statusStyles.warning;
            const Icon = style.icon;

            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg ${style.bg} border ${style.border} ${isRTL ? 'flex-row-reverse text-right' : ''}`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
                <p className={`text-sm ${style.text}`}>
                  {check.message}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
