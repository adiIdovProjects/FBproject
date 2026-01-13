'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Completing login...');

  useEffect(() => {
    const token = searchParams.get('token');
    const redirect = searchParams.get('redirect');

    // Handle login/connect flow
    if (token) {
      setMessage('Setting up your account...');

      // Store token
      localStorage.setItem('token', token);
      document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      // Redirect based on redirect param or default to select-accounts
      const redirectPath = redirect === 'select-accounts' ? '/select-accounts' :
                          redirect === 'settings' ? '/settings?tab=accounts' :
                          '/select-accounts';
      setTimeout(() => router.push(redirectPath), 500);
    } else {
      // No token - error occurred
      setMessage('Login failed. Redirecting...');
      setTimeout(() => router.push('/login?error=auth_failed'), 2000);
    }
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
}
