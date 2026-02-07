/**
 * MetricCard Component
 * Displays a single KPI metric with trend indicator using Tremor
 */

import React from 'react';
import { Card, Metric, Text } from '@tremor/react';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { MetricCardProps, MetricColor } from '../../types/dashboard.types';
import { InfoTooltip } from '../ui/InfoTooltip';
import { useTheme } from '../../context/ThemeContext';

// Color configuration for each metric color across themes
const COLOR_CONFIG: Record<MetricColor, {
  decoration: string;
  light: { iconBg: string; iconText: string; hoverBorder: string; hoverShadow: string; blur: string };
  dark: { iconBg: string; iconText: string; hoverBorder: string; hoverShadow: string; blur: string };
  colorful: { iconBg: string; iconText: string; hoverBorder: string; hoverShadow: string; blur: string; glow: string };
}> = {
  emerald: {
    decoration: 'emerald',
    light: { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', hoverBorder: 'hover:border-emerald-400/50', hoverShadow: 'hover:shadow-emerald-500/20', blur: 'bg-emerald-500/5 group-hover:bg-emerald-500/15' },
    dark: { iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-400', hoverBorder: 'hover:border-emerald-500/50', hoverShadow: 'hover:shadow-emerald-500/10', blur: 'bg-emerald-500/5 group-hover:bg-emerald-500/10' },
    colorful: { iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-300', hoverBorder: 'hover:border-emerald-400/50', hoverShadow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]', blur: 'bg-emerald-500/10 group-hover:bg-emerald-500/20', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.2)]' },
  },
  blue: {
    decoration: 'blue',
    light: { iconBg: 'bg-blue-100', iconText: 'text-blue-600', hoverBorder: 'hover:border-blue-400/50', hoverShadow: 'hover:shadow-blue-500/20', blur: 'bg-blue-500/5 group-hover:bg-blue-500/15' },
    dark: { iconBg: 'bg-blue-500/10', iconText: 'text-blue-400', hoverBorder: 'hover:border-blue-500/50', hoverShadow: 'hover:shadow-blue-500/10', blur: 'bg-blue-500/5 group-hover:bg-blue-500/10' },
    colorful: { iconBg: 'bg-blue-500/20', iconText: 'text-blue-300', hoverBorder: 'hover:border-blue-400/50', hoverShadow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]', blur: 'bg-blue-500/10 group-hover:bg-blue-500/20', glow: 'shadow-[0_0_10px_rgba(59,130,246,0.2)]' },
  },
  amber: {
    decoration: 'amber',
    light: { iconBg: 'bg-amber-100', iconText: 'text-amber-600', hoverBorder: 'hover:border-amber-400/50', hoverShadow: 'hover:shadow-amber-500/20', blur: 'bg-amber-500/5 group-hover:bg-amber-500/15' },
    dark: { iconBg: 'bg-amber-500/10', iconText: 'text-amber-400', hoverBorder: 'hover:border-amber-500/50', hoverShadow: 'hover:shadow-amber-500/10', blur: 'bg-amber-500/5 group-hover:bg-amber-500/10' },
    colorful: { iconBg: 'bg-amber-500/20', iconText: 'text-amber-300', hoverBorder: 'hover:border-amber-400/50', hoverShadow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]', blur: 'bg-amber-500/10 group-hover:bg-amber-500/20', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.2)]' },
  },
  purple: {
    decoration: 'purple',
    light: { iconBg: 'bg-purple-100', iconText: 'text-purple-600', hoverBorder: 'hover:border-purple-400/50', hoverShadow: 'hover:shadow-purple-500/20', blur: 'bg-purple-500/5 group-hover:bg-purple-500/15' },
    dark: { iconBg: 'bg-purple-500/10', iconText: 'text-purple-400', hoverBorder: 'hover:border-purple-500/50', hoverShadow: 'hover:shadow-purple-500/10', blur: 'bg-purple-500/5 group-hover:bg-purple-500/10' },
    colorful: { iconBg: 'bg-purple-500/20', iconText: 'text-purple-300', hoverBorder: 'hover:border-purple-400/50', hoverShadow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]', blur: 'bg-purple-500/10 group-hover:bg-purple-500/20', glow: 'shadow-[0_0_10px_rgba(168,85,247,0.2)]' },
  },
  orange: {
    decoration: 'orange',
    light: { iconBg: 'bg-orange-100', iconText: 'text-orange-600', hoverBorder: 'hover:border-orange-400/50', hoverShadow: 'hover:shadow-orange-500/20', blur: 'bg-orange-500/5 group-hover:bg-orange-500/15' },
    dark: { iconBg: 'bg-orange-500/10', iconText: 'text-orange-400', hoverBorder: 'hover:border-orange-500/50', hoverShadow: 'hover:shadow-orange-500/10', blur: 'bg-orange-500/5 group-hover:bg-orange-500/10' },
    colorful: { iconBg: 'bg-orange-500/20', iconText: 'text-orange-300', hoverBorder: 'hover:border-orange-400/50', hoverShadow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.3)]', blur: 'bg-orange-500/10 group-hover:bg-orange-500/20', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.2)]' },
  },
  rose: {
    decoration: 'rose',
    light: { iconBg: 'bg-rose-100', iconText: 'text-rose-600', hoverBorder: 'hover:border-rose-400/50', hoverShadow: 'hover:shadow-rose-500/20', blur: 'bg-rose-500/5 group-hover:bg-rose-500/15' },
    dark: { iconBg: 'bg-rose-500/10', iconText: 'text-rose-400', hoverBorder: 'hover:border-rose-500/50', hoverShadow: 'hover:shadow-rose-500/10', blur: 'bg-rose-500/5 group-hover:bg-rose-500/10' },
    colorful: { iconBg: 'bg-rose-500/20', iconText: 'text-rose-300', hoverBorder: 'hover:border-rose-400/50', hoverShadow: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.3)]', blur: 'bg-rose-500/10 group-hover:bg-rose-500/20', glow: 'shadow-[0_0_10px_rgba(244,63,94,0.2)]' },
  },
  indigo: {
    decoration: 'indigo',
    light: { iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', hoverBorder: 'hover:border-indigo-400/50', hoverShadow: 'hover:shadow-indigo-500/20', blur: 'bg-indigo-500/5 group-hover:bg-indigo-500/15' },
    dark: { iconBg: 'bg-indigo-500/10', iconText: 'text-indigo-400', hoverBorder: 'hover:border-indigo-500/50', hoverShadow: 'hover:shadow-indigo-500/10', blur: 'bg-indigo-500/5 group-hover:bg-indigo-500/10' },
    colorful: { iconBg: 'bg-indigo-500/20', iconText: 'text-indigo-300', hoverBorder: 'hover:border-indigo-400/50', hoverShadow: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]', blur: 'bg-indigo-500/10 group-hover:bg-indigo-500/20', glow: 'shadow-[0_0_10px_rgba(99,102,241,0.2)]' },
  },
};

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
  color = 'indigo',  // Default to indigo color theme
}) => {
  const { theme } = useTheme();
  const isColorful = theme === 'colorful';
  const isLight = theme === 'light';

  // Get color config for the current theme
  const colorConfig = COLOR_CONFIG[color];
  const themeColors = isColorful ? colorConfig.colorful : (isLight ? colorConfig.light : colorConfig.dark);
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
      className={`card-gradient border-border-subtle ${themeColors.hoverBorder} transition-all duration-500 shadow-2xl overflow-hidden relative group ${themeColors.hoverShadow}`}
      decoration="top"
      decorationColor={colorConfig.decoration as any}
    >
      {/* Blur blob with card-specific color */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-3xl transition-all duration-700 ${themeColors.blur}`}></div>

      {/* Header with Icon */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-1.5">
          <Text className="text-text-muted text-[10px] font-black uppercase tracking-widest">{title}</Text>
          {tooltipKey && <InfoTooltip tooltipKey={tooltipKey} size="sm" />}
        </div>
        <div className={`p-2.5 rounded-xl group-hover:scale-110 transition-transform ${themeColors.iconBg} ${isColorful && 'glow' in themeColors ? (themeColors as any).glow : ''}`}>
          <Icon className={`w-4 h-4 ${themeColors.iconText}`} />
        </div>
      </div>

      {/* Value and Trend */}
      {isLoading ? (
        <div className="flex items-center text-text-muted py-3 relative z-10">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="flex flex-col gap-1 relative z-10">
          <Metric className={`text-foreground text-3xl font-black tracking-tighter ${isColorful ? 'drop-shadow-[0_0_10px_rgba(0,212,255,0.3)]' : 'text-glow'}`}>{formatValue(value)}</Metric>

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
