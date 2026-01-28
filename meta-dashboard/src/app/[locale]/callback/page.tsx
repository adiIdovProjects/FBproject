'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/services/apiClient';
import { syncTimezone } from '@/services/auth.service';

// Whitelist of allowed redirect paths (security: prevents open redirect attacks)
const ALLOWED_REDIRECTS = [
  'select-accounts',
  'account-dashboard',
  'homepage',
  'settings',
  'reports',
  'campaigns',
  'creatives',
  'insights',
  'learning',
  'quiz',
  'onboard/connect-facebook',
];

// Validate redirect path against whitelist
function isValidRedirect(redirect: string | null): boolean {
  if (!redirect) return false;
  // Remove leading slash if present and check against whitelist
  const cleanPath = redirect.replace(/^\//, '');
  return ALLOWED_REDIRECTS.some(allowed =>
    cleanPath === allowed || cleanPath.startsWith(allowed + '?') || cleanPath.startsWith(allowed + '/')
  );
}

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useParams();
  const t = useTranslations();
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const redirectParam = searchParams.get('redirect');
      // Security: Only allow whitelisted redirect paths
      const redirect = isValidRedirect(redirectParam) ? redirectParam : null;
      const error = searchParams.get('error');
      const token = searchParams.get('token');

      // Set initial message
      setMessage(t('auth.completing_login'));

      // Check for errors
      if (error) {
        setMessage(t('auth.login_failed_redirecting'));
        setTimeout(() => router.push(`/${locale}/login?error=${error}`), 2000);
        return;
      }

      // If we have a token, set the session cookie via the API
      if (token) {
        try {
          await apiClient.post('/api/v1/auth/session', { token });
        } catch (err) {
          console.error('Failed to set session:', err);
          router.push(`/${locale}/login?error=session_failed`);
          return;
        }
      }

      setMessage(t('auth.setting_up_account'));

      // Sync user's browser timezone (non-blocking)
      syncTimezone().catch(() => {});

      // Redirect based on redirect param or default to select-accounts
      // The redirect param can be a path like 'select-accounts', 'account-dashboard', etc.
      // Add refresh param with timestamp to force refetch of accounts
      const refreshParam = `refresh=${Date.now()}`;
      const redirectPath = redirect
        ? `/${locale}/${redirect}${redirect.includes('?') ? '&' : '?'}${refreshParam}`
        : `/${locale}/select-accounts?${refreshParam}`;
      setTimeout(() => router.push(redirectPath), 500);
    };

    handleCallback();
  }, [router, searchParams, locale, t]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
}
