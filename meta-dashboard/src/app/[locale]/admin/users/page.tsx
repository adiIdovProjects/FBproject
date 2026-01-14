"use client";

/**
 * Admin Users List Page
 * Search and browse all users in the system
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Users,
  Search,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import { AdminLayout } from '../../../../components/admin/AdminLayout';
import {
  fetchUsersList,
  searchUsers,
} from '../../../../services/admin.service';

export default function AdminUsersPage() {
  const router = useRouter();
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch users list (when not searching)
  const { data: usersData, isLoading: isLoadingList } = useQuery({
    queryKey: ['admin-users-list', page, limit],
    queryFn: () => fetchUsersList(limit, page * limit),
    enabled: debouncedQuery === '',
  });

  // Search users (when searching)
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['admin-users-search', debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery, 50),
    enabled: debouncedQuery.length > 0,
  });

  const users = debouncedQuery ? searchResults : usersData?.users;
  const isLoading = debouncedQuery ? isSearching : isLoadingList;
  const total = usersData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout
      title="Users"
      description="Search and manage platform users"
    >
      {/* Stats */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-gray-400">
          {total > 0 && `${total} total users`}
        </span>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email, name, or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">User</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Plan</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Joined</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-700/50 animate-pulse">
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-700 rounded w-48"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-700 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-700 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-700 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              ))
            ) : users && users.length > 0 ? (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/${locale}/admin/users/${user.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {user.full_name || 'No name'}
                        </p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                        <p className="text-xs text-gray-500">ID: {user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.onboarding_completed ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-400 text-sm">
                          <XCircle className="w-4 h-4" />
                          Onboarding
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={user.subscription_status} plan={user.plan_type} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-400 text-sm">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  {debouncedQuery ? 'No users found matching your search' : 'No users found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (only when not searching) */}
      {!debouncedQuery && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </AdminLayout>
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
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor()}`}
    >
      {plan !== 'free' ? plan : status}
    </span>
  );
}
