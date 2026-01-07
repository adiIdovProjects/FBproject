"use client";

/**
 * Root Page - Redirects to Dashboard
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard (which will redirect to login if not authenticated)
    router.replace('/en/dashboard');
  }, [router]);

  return null;
}
