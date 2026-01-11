"use client";

/**
 * CTRTrendChart Component
 * Modal displaying CTR trend over time for a single creative
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { LineChart } from '@tremor/react';
import { fetchCreativeDetail } from '../../services/creatives.service';
import { DateRange } from '../../types/dashboard.types';

interface CTRTrendChartProps {
  creativeId: number;
  creativeName: string;
  dateRange: DateRange;
  accountId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CTRTrendChart: React.FC<CTRTrendChartProps> = ({
  creativeId,
  creativeName,
  dateRange,
  accountId,
  isOpen,
  onClose,
}) => {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && creativeId) {
      loadTrendData();
    }
  }, [isOpen, creativeId, dateRange, accountId]);

  const loadTrendData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCreativeDetail(creativeId, dateRange, accountId);

      if (data.trend && data.trend.length > 0) {
        // Transform trend data for the chart
        const chartData = data.trend.map((point: any) => ({
          date: point.date,
          CTR: point.clicks > 0 && point.impressions > 0
            ? ((point.clicks / point.impressions) * 100).toFixed(2)
            : 0,
          impressions: point.impressions,
        }));
        setTrendData(chartData);
      } else {
        setTrendData([]);
      }
    } catch (err: any) {
      console.error('[CTRTrendChart] Error loading trend data:', err);
      setError('Failed to load trend data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate 7-day moving average
  const calculateMovingAverage = (data: any[], window: number = 7) => {
    return data.map((point, index) => {
      const start = Math.max(0, index - window + 1);
      const subset = data.slice(start, index + 1);
      const avg = subset.reduce((sum, p) => sum + parseFloat(p.CTR), 0) / subset.length;
      return {
        ...point,
        '7-Day Avg': avg.toFixed(2),
      };
    });
  };

  const chartDataWithMA = trendData.length > 0 ? calculateMovingAverage(trendData) : [];

  // Calculate overall trend
  const calculateTrend = () => {
    if (chartDataWithMA.length < 2) return null;
    const first = parseFloat(chartDataWithMA[0].CTR);
    const last = parseFloat(chartDataWithMA[chartDataWithMA.length - 1].CTR);
    const change = ((last - first) / first) * 100;
    return {
      percentage: change,
      isPositive: change >= 0,
    };
  };

  const trend = calculateTrend();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4 card-gradient rounded-2xl border border-border-subtle shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <div>
            <h2 className="text-2xl font-bold text-white">CTR Trend Analysis</h2>
            <p className="text-sm text-gray-400 mt-1">{creativeName || `Creative ${creativeId}`}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
              <p className="text-gray-400">Loading trend data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-red-400 mb-2">{error}</p>
              <button
                onClick={loadTrendData}
                className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-white transition-colors"
              >
                Retry
              </button>
            </div>
          ) : trendData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-gray-400">No trend data available for this period</p>
            </div>
          ) : (
            <>
              {/* Trend Summary */}
              {trend && (
                <div className="mb-6 p-4 bg-white/5 rounded-xl border border-border-subtle">
                  <div className="flex items-center gap-3">
                    {trend.isPositive ? (
                      <div className="p-2 bg-green-900/30 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      </div>
                    ) : (
                      <div className="p-2 bg-red-900/30 rounded-lg">
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-400">Overall Trend</p>
                      <p className={`text-lg font-bold ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {trend.isPositive ? '+' : ''}{trend.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chart */}
              <div className="bg-white/5 rounded-xl p-6 border border-border-subtle">
                <h3 className="text-lg font-bold text-white mb-4">Click-Through Rate Over Time</h3>
                <LineChart
                  data={chartDataWithMA}
                  index="date"
                  categories={["CTR", "7-Day Avg"]}
                  colors={["blue", "amber"]}
                  valueFormatter={(value) => `${value}%`}
                  yAxisWidth={60}
                  showLegend={true}
                  showGridLines={true}
                  className="h-80"
                />
              </div>

              {/* Data Table Summary */}
              <div className="mt-6 bg-white/5 rounded-xl p-6 border border-border-subtle">
                <h3 className="text-lg font-bold text-white mb-4">Performance Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">First CTR</p>
                    <p className="text-xl font-bold text-white">{chartDataWithMA[0]?.CTR}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Latest CTR</p>
                    <p className="text-xl font-bold text-white">
                      {chartDataWithMA[chartDataWithMA.length - 1]?.CTR}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">7-Day Average</p>
                    <p className="text-xl font-bold text-white">
                      {chartDataWithMA[chartDataWithMA.length - 1]?.['7-Day Avg']}%
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CTRTrendChart;
