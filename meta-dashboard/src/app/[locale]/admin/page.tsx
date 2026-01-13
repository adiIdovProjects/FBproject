"use client";

/**
 * Admin Analytics Dashboard
 * Internal dashboard for tracking platform usage metrics
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Users,
  Building2,
  Activity,
  AlertCircle,
  TrendingUp,
  UserCheck,
  ArrowRight,
  Shield,
} from 'lucide-react';

// Components
import { MainLayout } from '../../../components/MainLayout';

// Services
import {
  fetchAdminDashboard,
  fetchErrorLogs,
  fetchActivityLogs,
  AdminDashboardResponse,
  ErrorLogEntry,
  ActivityLogEntry,
} from '../../../services/admin.service';
import { apiClient } from '../../../services/apiClient';

// Chart components
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function AdminDashboard() {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check admin access
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await apiClient.get('/api/v1/users/me');
        if (!response.data.is_admin) {
          router.push('/en/dashboard');
          return;
        }
        setIsAdmin(true);
      } catch {
        router.push('/en/login');
      }
    };
    checkAdmin();
  }, [router]);

  // Fetch dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['admin-dashboard', days],
    queryFn: () => fetchAdminDashboard(days),
    enabled: isAdmin === true,
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch error logs
  const { data: errorLogs } = useQuery({
    queryKey: ['admin-errors'],
    queryFn: () => fetchErrorLogs(50),
    enabled: isAdmin === true,
  });

  // Fetch activity logs
  const { data: activityLogs } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: () => fetchActivityLogs(20),
    enabled: isAdmin === true,
  });

  // Show loading while checking admin
  if (isAdmin === null) {
    return (
      <MainLayout title="Admin Dashboard" description="Checking access...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      </MainLayout>
    );
  }

  const userMetrics = dashboardData?.user_metrics;
  const accountMetrics = dashboardData?.account_metrics;
  const funnelMetrics = dashboardData?.funnel_metrics;
  const authBreakdown = dashboardData?.auth_breakdown || [];

  // Prepare funnel data for chart
  const funnelData = funnelMetrics
    ? [
        { name: 'Signups', value: funnelMetrics.signups, fill: '#6366f1' },
        { name: 'FB Connected', value: funnelMetrics.facebook_connected, fill: '#8b5cf6' },
        { name: 'Accounts Linked', value: funnelMetrics.accounts_linked, fill: '#a855f7' },
        { name: 'Onboarding Done', value: funnelMetrics.onboarding_completed, fill: '#22c55e' },
      ]
    : [];

  // Prepare accounts per user data
  const accountsPerUserData = accountMetrics?.accounts_per_user
    ? Object.entries(accountMetrics.accounts_per_user).map(([bucket, count]) => ({
        name: `${bucket} accounts`,
        value: count,
      }))
    : [];

  return (
    <MainLayout
      title="Admin Dashboard"
      description="Platform analytics and user metrics"
    >
      {/* Period Selector */}
      <div className="flex items-center gap-4 mb-8">
        <Shield className="w-6 h-6 text-indigo-400" />
        <span className="text-gray-400">Period:</span>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <MetricCardSimple
          title="Total Users"
          value={userMetrics?.total_users || 0}
          icon={Users}
          loading={isDashboardLoading}
        />
        <MetricCardSimple
          title="DAU"
          value={userMetrics?.daily_active_users || 0}
          icon={Activity}
          subtitle="Daily Active"
          loading={isDashboardLoading}
        />
        <MetricCardSimple
          title="WAU"
          value={userMetrics?.weekly_active_users || 0}
          icon={Activity}
          subtitle="Weekly Active"
          loading={isDashboardLoading}
        />
        <MetricCardSimple
          title="MAU"
          value={userMetrics?.monthly_active_users || 0}
          icon={Activity}
          subtitle="Monthly Active"
          loading={isDashboardLoading}
        />
        <MetricCardSimple
          title="Ad Accounts"
          value={accountMetrics?.total_ad_accounts || 0}
          icon={Building2}
          loading={isDashboardLoading}
        />
      </div>

      {/* Second Row KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCardSimple
          title="Onboarding Rate"
          value={`${userMetrics?.onboarding_completion_rate || 0}%`}
          icon={UserCheck}
          loading={isDashboardLoading}
        />
        <MetricCardSimple
          title="Unique Accounts"
          value={accountMetrics?.unique_ad_accounts || 0}
          icon={Building2}
          subtitle="Distinct"
          loading={isDashboardLoading}
        />
        <MetricCardSimple
          title="FB Connected"
          value={funnelMetrics?.facebook_connected || 0}
          icon={TrendingUp}
          loading={isDashboardLoading}
        />
        <MetricCardSimple
          title="Completed Onboarding"
          value={funnelMetrics?.onboarding_completed || 0}
          icon={UserCheck}
          loading={isDashboardLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Signups Over Time */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Signups Over Time</h3>
          <div className="h-64">
            {userMetrics?.signups_over_time && userMetrics.signups_over_time.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userMetrics.signups_over_time}>
                  <defs>
                    <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    tickFormatter={(val) => val.slice(5)} // Show MM-DD
                  />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    fill="url(#signupGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No signup data available
              </div>
            )}
          </div>
        </div>

        {/* Onboarding Funnel */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Onboarding Funnel</h3>
          <div className="h-64">
            {funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No funnel data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth & Accounts Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Auth Method Breakdown */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Authentication Methods</h3>
          <div className="h-64">
            {authBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={authBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="method"
                    label={({ method, count }) => `${method}: ${count}`}
                  >
                    {authBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No auth data available
              </div>
            )}
          </div>
        </div>

        {/* Accounts Per User */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Accounts Per User</h3>
          <div className="h-64">
            {accountsPerUserData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accountsPerUserData}>
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
                No accounts data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity & Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Activity */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Recent Activity
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activityLogs && activityLogs.length > 0 ? (
              activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg"
                >
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{log.event_type}</p>
                    <p className="text-xs text-gray-500">
                      User: {log.user_id} | {log.created_at?.slice(0, 16)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>

        {/* Error Logs */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Error Logs
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {errorLogs && errorLogs.length > 0 ? (
              errorLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-900/30 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-red-300 font-medium">{log.event_type}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {log.description || 'No description'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      User: {log.user_id} | {log.created_at?.slice(0, 16)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-green-400 text-center py-4">No errors found</p>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Placeholder */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 opacity-60">
        <h3 className="text-gray-400 font-semibold mb-4">Revenue Metrics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-900/30 rounded-xl">
            <p className="text-2xl font-bold text-gray-500">$0</p>
            <p className="text-sm text-gray-600">MRR</p>
          </div>
          <div className="text-center p-4 bg-gray-900/30 rounded-xl">
            <p className="text-2xl font-bold text-gray-500">$0</p>
            <p className="text-sm text-gray-600">Total Revenue</p>
          </div>
          <div className="text-center p-4 bg-gray-900/30 rounded-xl">
            <p className="text-2xl font-bold text-gray-500">0</p>
            <p className="text-sm text-gray-600">Paying Customers</p>
          </div>
        </div>
        <p className="text-center text-gray-500 text-sm mt-4">
          Stripe integration coming soon
        </p>
      </div>
    </MainLayout>
  );
}

// Simple metric card component for admin dashboard
function MetricCardSimple({
  title,
  value,
  icon: Icon,
  subtitle,
  loading,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
        <div className="h-8 bg-gray-700 rounded w-16"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-indigo-500/50 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-indigo-400" />
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}
