'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/services/activity.service';

/**
 * Hook to automatically track page views on route changes.
 * Add this to your main layout to track all page visits.
 * Only tracks if user is logged in (has token).
 */
export function usePageTracking() {
  const pathname = usePathname();
  const lastPathRef = useRef<string>('');

  useEffect(() => {
    // Skip if same path (avoid double tracking)
    if (pathname === lastPathRef.current) {
      return;
    }

    // Skip tracking on login/auth pages (user likely not authenticated)
    if (pathname.includes('/login') || pathname.includes('/auth/')) {
      return;
    }

    lastPathRef.current = pathname;

    // Track page view
    const pageTitle = typeof document !== 'undefined' ? document.title : undefined;
    const referrer = typeof document !== 'undefined' ? document.referrer : undefined;

    trackPageView(pathname, pageTitle, referrer);
  }, [pathname]);
}
