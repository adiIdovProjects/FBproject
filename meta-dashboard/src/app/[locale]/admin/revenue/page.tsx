"use client";

/**
 * Admin Revenue Page
 * MRR, churn, trial conversion, revenue trends
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

import { AdminLayout } from '../../../../components/admin/AdminLayout';
import { fetchRevenueMetrics } from '../../../../services/admin.service';

export default function AdminRevenuePage() {
  const [days, setDays] = useState(30);

  // Fetch revenue metrics
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['admin-revenue-metrics', days],
    queryFn: () => fetchRevenueMetrics(days),
  });

  const subscriptionStats = revenueData?.subscription_stats;

  // Placeholder data for revenue chart (will be replaced with real Stripe data)
  const revenueTrend = [
    { date: '2024-01-01', revenue: 1200 },
    { date: '2024-01-08', revenue: 1450 },
    { date: '2024-01-15', revenue: 1380 },
    { date: '2024-01-22', revenue: 1620 },
    { date: '2024-01-29', revenue: 1890 },
  ];

  return (
    <AdminLayout
      title="Revenue"
      description="Subscription metrics and revenue analytics"
    >
      {/* Period Selector */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-gray-400">Period:</span>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="MRR"
          value={revenueData?.mrr ? `$${revenueData.mrr.toLocaleString()}` : '$0'}
          subtitle="Monthly Recurring Revenue"
          icon={DollarSign}
          iconColor="text-green-400"
          loading={isLoading}
          placeholder={revenueData?.status === 'basic'}
        />
        <MetricCard
          title="Churn Rate"
          value={`${revenueData?.churn_rate?.toFixed(1) || 0}%`}
          subtitle={`Last ${days} days`}
          icon={TrendingDown}
          iconColor="text-red-400"
          loading={isLoading}
        />
        <MetricCard
          title="Trial → Paid"
          value={`${revenueData?.trial_to_paid_rate?.toFixed(1) || 0}%`}
          subtitle="Conversion rate"
          icon={TrendingUp}
          iconColor="text-blue-400"
          loading={isLoading}
        />
        <MetricCard
          title="Paying Customers"
          value={String(revenueData?.paying_customers || 0)}
          subtitle="Active subscriptions"
          icon={Users}
          iconColor="text-purple-400"
          loading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Revenue Trend</h3>
          <div className="h-64">
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Revenue data coming soon</p>
                <p className="text-sm">Connect Stripe to see real metrics</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription by Plan */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Subscriptions by Plan</h3>
          <div className="h-64">
            {subscriptionStats?.by_plan ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(subscriptionStats.by_plan).map(([plan, count]) => ({
                  name: plan,
                  value: count,
                }))}>
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No plan data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Subscriptions by Status</h3>
          <div className="space-y-3">
            {subscriptionStats?.by_status ? (
              Object.entries(subscriptionStats.by_status).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <StatusDot status={status} />
                    <span className="text-white capitalize">{status}</span>
                  </div>
                  <span className="text-gray-400 font-mono">{count as number}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No subscription data</p>
            )}
          </div>
        </div>

        {/* Trials Ending Soon */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Trial Alerts</h3>
          <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-yellow-200 font-medium">
                  {subscriptionStats?.trials_ending_soon || 0} trials ending soon
                </p>
                <p className="text-yellow-300/70 text-sm">
                  Users whose trial expires in the next 7 days
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-900/50 rounded-xl">
            <p className="text-gray-400 text-sm">
              Stripe integration is required for full revenue metrics including:
            </p>
            <ul className="text-gray-500 text-sm mt-2 space-y-1">
              <li>• Monthly Recurring Revenue (MRR)</li>
              <li>• Customer Lifetime Value (LTV)</li>
              <li>• Churn rate calculations</li>
              <li>• Revenue trends over time</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  change,
  positive,
  loading,
  placeholder,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof DollarSign;
  iconColor: string;
  change?: string;
  positive?: boolean;
  loading?: boolean;
  placeholder?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
        <div className="h-8 bg-gray-700 rounded w-16"></div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-xl p-4 ${placeholder ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        {change && (
          <span className={`text-xs flex items-center gap-1 ${positive ? 'text-green-400' : 'text-red-400'}`}>
            {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-400',
    trialing: 'bg-blue-400',
    cancelled: 'bg-red-400',
    past_due: 'bg-orange-400',
    free: 'bg-gray-400',
  };

  return (
    <div className={`w-2 h-2 rounded-full ${colors[status] || 'bg-gray-400'}`} />
  );
}
