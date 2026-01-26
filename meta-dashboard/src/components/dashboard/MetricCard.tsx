/**
 * MetricCard Component
 * Displays a single KPI metric with trend indicator using Tremor
 */

import React from 'react';
import { Card, Metric, Text } from '@tremor/react';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { MetricCardProps } from '../../types/dashboard.types';
import { InfoTooltip } from '../ui/InfoTooltip';

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  trend,
  icon: Icon,
  format,
  isLoading = false,
  currency = 'USD',  // Default to USD if not provided
  tooltipKey,
  metricType = 'performance',  // Default to performance metric type
}) => {
  // Format the value based on type
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;

    if (isNaN(val) || !isFinite(val)) {
      return format === 'currency' ? `${currency} 0.00` : '0';
    }

    switch (format) {
      case 'currency':
        // Use metricType prop instead of string matching for locale independence
        const isSpend = metricType === 'spend';
        const isEfficiency = metricType === 'efficiency';
        const decimals = isSpend ? 0 : (isEfficiency ? 1 : 2);
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(val);

      case 'percentage':
        return `${val.toFixed(2)}%`;

      case 'decimal':
        return val.toFixed(2);

      case 'number':
      default:
        return val.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
  };

  // Determine trend style based on metricType prop (not string matching)
  const getTrendStyle = (): { color: string; bgColor: string; icon: 'up' | 'down'; isGood: boolean } => {
    if (trend === undefined || trend === null || trend === 0) {
      return { color: 'text-text-muted', bgColor: 'bg-secondary', icon: 'up', isGood: false };
    }

    const isPositive = trend > 0;
    const isNegative = trend < 0;

    // Spend and neutral are neutral - no judgment on whether up/down is good or bad
    if (metricType === 'spend' || metricType === 'neutral') {
      return {
        color: 'text-text-muted',
        bgColor: 'bg-secondary',
        icon: isPositive ? 'up' : 'down',
        isGood: false
      };
    }

    let isGood = false;

    if (metricType === 'efficiency') {
      // For efficiency metrics (CPC, CPA): down is good (lower cost), up is bad (higher cost)
      isGood = isNegative;
    } else {
      // For performance metrics: up is good (green), down is bad (red)
      isGood = isPositive;
    }

    return {
      color: isGood ? 'text-success' : 'text-error',
      bgColor: isGood ? 'bg-success-bg' : 'bg-error-bg',
      icon: isPositive ? 'up' : 'down',
      isGood
    };
  };

  const trendStyle = getTrendStyle();

  return (
    <Card
      className="card-gradient border-border-subtle hover:border-accent/50 transition-all duration-500 shadow-2xl hover:shadow-accent/10 overflow-hidden relative group"
      decoration="top"
      decorationColor="indigo"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-accent/10 transition-all duration-700"></div>

      {/* Header with Icon */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-1.5">
          <Text className="text-text-muted text-[10px] font-black uppercase tracking-widest">{title}</Text>
          {tooltipKey && <InfoTooltip tooltipKey={tooltipKey} size="sm" />}
        </div>
        <div className="p-2.5 bg-accent/10 rounded-xl group-hover:scale-110 transition-transform">
          <Icon className="w-4 h-4 text-accent" />
        </div>
      </div>

      {/* Value and Trend */}
      {isLoading ? (
        <div className="flex items-center text-text-muted py-3 relative z-10">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="flex flex-col gap-1 relative z-10">
          <Metric className="text-foreground text-3xl font-black tracking-tighter text-glow">{formatValue(value)}</Metric>

          {trend !== undefined && trend !== null && trend !== 0 && (
            <div className={`mt-3 flex items-center w-fit gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${trendStyle.bgColor} ${trendStyle.color}`}>
              {trendStyle.icon === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default MetricCard;
