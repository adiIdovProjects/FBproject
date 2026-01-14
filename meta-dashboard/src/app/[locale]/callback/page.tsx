'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useParams();
  const t = useTranslations();
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const redirect = searchParams.get('redirect');

    // Set initial message
    setMessage(t('auth.completing_login'));

    // Handle login/connect flow
    if (token) {
      setMessage(t('auth.setting_up_account'));

      // Store token
      localStorage.setItem('token', token);
      document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      // Redirect based on redirect param or default to select-accounts
      const redirectPath = redirect === 'select-accounts' ? `/${locale}/select-accounts` :
                          redirect === 'settings' ? `/${locale}/settings?tab=accounts` :
                          `/${locale}/select-accounts`;
      setTimeout(() => router.push(redirectPath), 500);
    } else {
      // No token - error occurred
      setMessage(t('auth.login_failed_redirecting'));
      setTimeout(() => router.push(`/${locale}/login?error=auth_failed`), 2000);
    }
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
