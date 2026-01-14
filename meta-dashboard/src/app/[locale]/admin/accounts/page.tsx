"use client";

/**
 * Admin Accounts Page
 * Account health, data freshness, sync status
 */

import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Database,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

import { AdminLayout } from '../../../../components/admin/AdminLayout';
import { fetchAdminDashboard, fetchAccountHealth } from '../../../../services/admin.service';

export default function AdminAccountsPage() {
  // Fetch dashboard data for account metrics
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['admin-dashboard', 30],
    queryFn: () => fetchAdminDashboard(30),
  });

  // Fetch account health data
  const { data: healthData, isLoading: isLoadingHealth } = useQuery({
    queryKey: ['admin-account-health'],
    queryFn: fetchAccountHealth,
  });

  const isLoading = isLoadingDashboard || isLoadingHealth;
  const accountMetrics = dashboardData?.account_metrics;

  return (
    <AdminLayout
      title="Accounts"
      description="Ad account health and data status"
    >
      {/* Account KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Accounts"
          value={healthData?.total_accounts || accountMetrics?.total_ad_accounts || 0}
          icon={Building2}
          iconColor="text-indigo-400"
          loading={isLoading}
        />
        <MetricCard
          title="Active Accounts"
          value={healthData?.active_accounts || 0}
          subtitle="With recent data"
          icon={CheckCircle}
          iconColor="text-green-400"
          loading={isLoading}
        />
        <MetricCard
          title="Stale"
          value={healthData?.stale_accounts || 0}
          subtitle=">7 days old"
          icon={AlertTriangle}
          iconColor="text-yellow-400"
          loading={isLoading}
        />
        <MetricCard
          title="No Data"
          value={healthData?.no_data_accounts || 0}
          subtitle="Never synced"
          icon={XCircle}
          iconColor="text-red-400"
          loading={isLoading}
        />
      </div>

      {/* Accounts Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Accounts Per User */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Accounts Per User Distribution</h3>
          <div className="space-y-3">
            {accountMetrics?.accounts_per_user ? (
              Object.entries(accountMetrics.accounts_per_user).map(([bucket, count]) => (
                <div key={bucket} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <span className="text-white">{bucket} accounts</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${Math.min(100, ((count as number) / (accountMetrics.total_ad_accounts || 1)) * 100 * 3)}%`
                        }}
                      />
                    </div>
                    <span className="text-gray-400 font-mono w-12 text-right">{count as number}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No distribution data</p>
            )}
          </div>
        </div>

        {/* Account Health Summary */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Account Health</h3>

          <div className="space-y-4">
            <div className="p-4 bg-gray-900/50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">Total Spend (30d)</span>
              </div>
              <p className="text-2xl font-bold text-white">
                ${(healthData?.total_spend_30d || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Aggregate spend across all accounts
              </p>
            </div>

            <div className="p-4 bg-gray-900/50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <RefreshCw className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium">Account Health Rate</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {healthData?.total_accounts
                  ? ((healthData.active_accounts / healthData.total_accounts) * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Accounts with data within last 7 days
              </p>
            </div>

            {(healthData?.stale_accounts || 0) > 0 && (
              <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-200 font-medium">{healthData?.stale_accounts} Stale Accounts</span>
                </div>
                <p className="text-yellow-300/70 text-sm">
                  These accounts haven't received new data in over 7 days.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Data Status */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Recent Account Data</h3>
        {healthData?.last_syncs && healthData.last_syncs.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {healthData.last_syncs.map((account) => {
              const lastDate = account.last_data_date ? new Date(account.last_data_date) : null;
              const daysSince = lastDate
                ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
                : null;
              const isStale = daysSince !== null && daysSince > 7;

              return (
                <div
                  key={account.account_id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isStale ? 'bg-yellow-900/20 border border-yellow-500/30' : 'bg-gray-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className={`w-5 h-5 ${isStale ? 'text-yellow-400' : 'text-indigo-400'}`} />
                    <div>
                      <p className="text-white font-medium">{account.account_name}</p>
                      <p className="text-xs text-gray-500">ID: {account.account_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm ${isStale ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {lastDate ? lastDate.toLocaleDateString() : 'No data'}
                    </p>
                    {daysSince !== null && (
                      <p className="text-xs text-gray-500">
                        {daysSince === 0 ? 'Today' : `${daysSince} day${daysSince !== 1 ? 's' : ''} ago`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No account data available</p>
          </div>
        )}
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
  loading,
  placeholder,
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: typeof Building2;
  iconColor: string;
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
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
