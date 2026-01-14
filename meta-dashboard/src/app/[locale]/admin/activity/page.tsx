"use client";

/**
 * Admin Activity Page
 * Activity logs, error trends, feature adoption
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  TrendingUp,
  Eye,
  Zap,
  ArrowRight,
} from 'lucide-react';

import { AdminLayout } from '../../../../components/admin/AdminLayout';
import {
  fetchActivityLogs,
  fetchErrorLogs,
  fetchFeatureAdoption,
  fetchErrorTrends,
} from '../../../../services/admin.service';

export default function AdminActivityPage() {
  const [activityLimit, setActivityLimit] = useState(50);
  const [errorLimit, setErrorLimit] = useState(50);
  const [days, setDays] = useState(30);

  // Fetch activity logs
  const { data: activityLogs, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['admin-activity', activityLimit],
    queryFn: () => fetchActivityLogs(activityLimit),
  });

  // Fetch error logs
  const { data: errorLogs, isLoading: isLoadingErrors } = useQuery({
    queryKey: ['admin-errors', errorLimit],
    queryFn: () => fetchErrorLogs(errorLimit),
  });

  // Fetch feature adoption
  const { data: featureData } = useQuery({
    queryKey: ['admin-feature-adoption', days],
    queryFn: () => fetchFeatureAdoption(days),
  });

  // Fetch error trends
  const { data: errorTrends } = useQuery({
    queryKey: ['admin-error-trends', days],
    queryFn: () => fetchErrorTrends(days),
  });

  return (
    <AdminLayout
      title="Activity"
      description="Platform activity, errors, and feature usage"
    >
      {/* Activity KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Recent Events"
          value={activityLogs?.length || 0}
          icon={Activity}
          iconColor="text-indigo-400"
        />
        <MetricCard
          title="Recent Errors"
          value={errorLogs?.length || 0}
          icon={AlertCircle}
          iconColor="text-red-400"
        />
        <MetricCard
          title="Active Users"
          value={featureData?.total_active_users || 0}
          subtitle={`Last ${days} days`}
          icon={Zap}
          iconColor="text-yellow-400"
        />
        <MetricCard
          title="Error Types"
          value={errorTrends?.summary?.length || 0}
          subtitle="Unique errors"
          icon={Eye}
          iconColor="text-blue-400"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Activity */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              Recent Activity
            </h3>
            <select
              value={activityLimit}
              onChange={(e) => setActivityLimit(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            >
              <option value={20}>Last 20</option>
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
            </select>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoadingActivity ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 bg-gray-900/50 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-48"></div>
                </div>
              ))
            ) : activityLogs && activityLogs.length > 0 ? (
              activityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
                  <ArrowRight className="w-4 h-4 text-gray-500 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{log.event_type}</p>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Error Logs
            </h3>
            <select
              value={errorLimit}
              onChange={(e) => setErrorLimit(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            >
              <option value={20}>Last 20</option>
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
            </select>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoadingErrors ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 bg-red-900/20 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-48"></div>
                </div>
              ))
            ) : errorLogs && errorLogs.length > 0 ? (
              errorLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-900/30 rounded-lg">
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
              <div className="text-center py-4">
                <p className="text-green-400">No errors found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature Adoption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Feature Adoption
          </h3>
          {featureData?.features && featureData.features.length > 0 ? (
            <div className="space-y-3">
              {featureData.features.map((feature) => (
                <div key={feature.feature} className="p-3 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium capitalize">{feature.feature.replace(/_/g, ' ')}</span>
                    <span className="text-indigo-400 font-mono">{feature.adoption_rate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, feature.adoption_rate)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-20 text-right">
                      {feature.unique_users} users
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No feature data available</p>
            </div>
          )}
        </div>

        {/* Error Summary */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Error Summary ({days} days)
          </h3>
          {errorTrends?.summary && errorTrends.summary.length > 0 ? (
            <div className="space-y-2">
              {errorTrends.summary.map((error) => (
                <div key={error.error_type} className="flex items-center justify-between p-3 bg-red-900/20 border border-red-900/30 rounded-lg">
                  <div>
                    <p className="text-red-300 font-medium">{error.error_type}</p>
                    <p className="text-xs text-gray-500">{error.affected_users} affected users</p>
                  </div>
                  <span className="text-2xl font-bold text-red-400">{error.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-green-400">
              <p>No errors in the last {days} days</p>
            </div>
          )}
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
  placeholder,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: typeof Activity;
  iconColor: string;
  placeholder?: boolean;
}) {
  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-xl p-4 ${placeholder ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
