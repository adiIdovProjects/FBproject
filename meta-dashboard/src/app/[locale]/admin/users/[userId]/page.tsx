"use client";

/**
 * Admin User Detail Page
 * View comprehensive user information with tabs
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  User,
  ArrowLeft,
  Shield,
  CreditCard,
  Activity,
  Eye,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

import { AdminLayout } from '../../../../../components/admin/AdminLayout';
import {
  fetchUserDetail,
  fetchUserActivity,
  fetchUserPageViews,
  fetchUserSubscriptionHistory,
  UserDetail,
  UserActivityEvent,
  UserPageView,
  SubscriptionHistoryEvent,
} from '../../../../../services/admin.service';

type Tab = 'profile' | 'subscription' | 'accounts' | 'activity' | 'pageviews';

export default function UserDetailPage() {
  const params = useParams();
  const locale = useLocale();
  const userId = Number(params.userId);

  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Fetch user detail
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: () => fetchUserDetail(userId),
    enabled: !isNaN(userId),
  });

  // Fetch activity (lazy load when tab is active)
  const { data: activity } = useQuery({
    queryKey: ['admin-user-activity', userId],
    queryFn: () => fetchUserActivity(userId, 100),
    enabled: activeTab === 'activity',
  });

  // Fetch page views (lazy load when tab is active)
  const { data: pageViews } = useQuery({
    queryKey: ['admin-user-pageviews', userId],
    queryFn: () => fetchUserPageViews(userId, 100),
    enabled: activeTab === 'pageviews',
  });

  // Fetch subscription history (lazy load when tab is active)
  const { data: subHistory } = useQuery({
    queryKey: ['admin-user-subscription-history', userId],
    queryFn: () => fetchUserSubscriptionHistory(userId),
    enabled: activeTab === 'subscription',
  });

  if (isLoadingUser) {
    return (
      <AdminLayout title="User Details" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout title="User Not Found" description="">
        <div className="text-center py-12">
          <p className="text-gray-400">User not found</p>
          <Link href={`/${locale}/admin/users`} className="text-indigo-400 hover:underline mt-4 inline-block">
            Back to Users
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'accounts', label: 'Accounts', icon: Building2 },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'pageviews', label: 'Page Views', icon: Eye },
  ];

  return (
    <AdminLayout
      title={user.full_name || user.email}
      description="User details and activity"
    >
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href={`/${locale}/admin/users`}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Link>
      </div>

      {/* User Header */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <User className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">
              {user.full_name || 'No Name'}
            </h2>
            <p className="text-gray-400">{user.email}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>ID: {user.id}</span>
              <span>Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</span>
              {user.is_admin && (
                <span className="flex items-center gap-1 text-indigo-400">
                  <Shield className="w-4 h-4" />
                  Admin
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={user.subscription.status} plan={user.subscription.plan_type} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
        {activeTab === 'profile' && <ProfileTab user={user} />}
        {activeTab === 'subscription' && <SubscriptionTab user={user} history={subHistory} />}
        {activeTab === 'accounts' && <AccountsTab user={user} />}
        {activeTab === 'activity' && <ActivityTab activity={activity} />}
        {activeTab === 'pageviews' && <PageViewsTab pageViews={pageViews} />}
      </div>
    </AdminLayout>
  );
}

function ProfileTab({ user }: { user: UserDetail }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Full Name" value={user.full_name || '-'} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Job Title" value={user.job_title || '-'} />
          <InfoRow label="Experience" value={user.years_experience || '-'} />
          <InfoRow label="Referral Source" value={user.referral_source || '-'} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Authentication</h3>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow
            label="Email Verified"
            value={user.email_verified ? 'Yes' : 'No'}
            icon={user.email_verified ? CheckCircle : XCircle}
            iconColor={user.email_verified ? 'text-green-400' : 'text-red-400'}
          />
          <InfoRow
            label="Facebook Connected"
            value={user.fb_connected ? 'Yes' : 'No'}
            icon={user.fb_connected ? CheckCircle : XCircle}
            iconColor={user.fb_connected ? 'text-green-400' : 'text-gray-500'}
          />
          <InfoRow
            label="Google Connected"
            value={user.google_connected ? 'Yes' : 'No'}
            icon={user.google_connected ? CheckCircle : XCircle}
            iconColor={user.google_connected ? 'text-green-400' : 'text-gray-500'}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Onboarding</h3>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow
            label="Completed"
            value={user.onboarding_completed ? 'Yes' : 'No'}
            icon={user.onboarding_completed ? CheckCircle : Clock}
            iconColor={user.onboarding_completed ? 'text-green-400' : 'text-yellow-400'}
          />
          <InfoRow label="Current Step" value={user.onboarding_step || '-'} />
        </div>
      </div>
    </div>
  );
}

function SubscriptionTab({ user, history }: { user: UserDetail; history?: SubscriptionHistoryEvent[] }) {
  const sub = user.subscription;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Current Subscription</h3>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Status" value={sub.status} />
          <InfoRow label="Plan" value={sub.plan_type} />
          <InfoRow label="Trial Start" value={sub.trial_start ? new Date(sub.trial_start).toLocaleDateString() : '-'} />
          <InfoRow label="Trial End" value={sub.trial_end ? new Date(sub.trial_end).toLocaleDateString() : '-'} />
          <InfoRow label="Period End" value={sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '-'} />
          <InfoRow label="Cancelled At" value={sub.cancelled_at ? new Date(sub.cancelled_at).toLocaleDateString() : '-'} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Subscription History</h3>
        {history && history.length > 0 ? (
          <div className="space-y-2">
            {history.map((event) => (
              <div key={event.id} className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <div className="flex-1">
                  <p className="text-white text-sm">{event.event_type}</p>
                  {event.from_plan && event.to_plan && (
                    <p className="text-xs text-gray-500">
                      {event.from_plan} → {event.to_plan}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {event.created_at ? new Date(event.created_at).toLocaleString() : '-'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No subscription history</p>
        )}
      </div>
    </div>
  );
}

function AccountsTab({ user }: { user: UserDetail }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">
        Linked Ad Accounts ({user.account_count})
      </h3>
      {user.linked_accounts.length > 0 ? (
        <div className="space-y-2">
          {user.linked_accounts.map((account) => (
            <div key={account.account_id} className="flex items-center gap-4 p-4 bg-gray-900/50 rounded-lg">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <div className="flex-1">
                <p className="text-white font-medium">{account.account_name}</p>
                <p className="text-sm text-gray-500">ID: {account.account_id}</p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                {account.permission_level}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No linked accounts</p>
      )}
    </div>
  );
}

function ActivityTab({ activity }: { activity?: UserActivityEvent[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">Activity Timeline</h3>
      {activity && activity.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activity.map((event) => (
            <div key={event.id} className="flex items-start gap-4 p-3 bg-gray-900/50 rounded-lg">
              <Activity className="w-4 h-4 text-indigo-400 mt-1" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{event.event_type}</p>
                <p className="text-xs text-gray-400 truncate">{event.description || '-'}</p>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {event.created_at ? new Date(event.created_at).toLocaleString() : '-'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No activity recorded</p>
      )}
    </div>
  );
}

function PageViewsTab({ pageViews }: { pageViews?: UserPageView[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">Page View History</h3>
      {pageViews && pageViews.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {pageViews.map((view) => (
            <div key={view.id} className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg">
              <Eye className="w-4 h-4 text-indigo-400" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-mono">{view.page_path}</p>
                {view.page_title && <p className="text-xs text-gray-500">{view.page_title}</p>}
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {view.created_at ? new Date(view.created_at).toLocaleString() : '-'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No page views recorded</p>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string;
  icon?: typeof CheckCircle;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-white text-sm flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status, plan }: { status: string; plan: string }) {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'trialing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'past_due':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor()}`}
    >
      {plan !== 'free' ? `${plan} (${status})` : status}
    </span>
  );
}
