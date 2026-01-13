import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

// Routes that require completed onboarding
const PROTECTED_ROUTES = [
  '/dashboard',
  '/campaigns',
  '/creatives',
  '/insights',
  '/settings',
  '/reports',
  '/uploader'
];

// Routes that are part of onboarding flow
const ONBOARDING_ROUTES = [
  '/login',
  '/auth/verify',
  '/onboard/connect-facebook',
  '/select-accounts',
  '/quiz'
];

// Create the i18n middleware
const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'ar', 'he', 'fr', 'de'],
  defaultLocale: 'en',
  localeDetection: true
});

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static files, API routes, etc.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // First, apply i18n middleware
  const intlResponse = intlMiddleware(request);

  // Extract locale from path (e.g., /en/dashboard -> /dashboard)
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, '/');

  // Get token from cookie or header
  const token = request.cookies.get('token')?.value;

  if (!token) {
    // No token - redirect to login if accessing protected route
    if (PROTECTED_ROUTES.some(route => pathWithoutLocale.startsWith(route))) {
      const locale = pathname.match(/^\/([a-z]{2})\//)?.[1] || 'en';
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
    return intlResponse;
  }

  // Check onboarding status for protected routes
  if (PROTECTED_ROUTES.some(route => pathWithoutLocale.startsWith(route))) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/onboarding/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const status = await response.json();

        if (!status.onboarding_completed) {
          // Not completed - redirect to next onboarding step
          const locale = pathname.match(/^\/([a-z]{2})\//)?.[1] || 'en';
          return NextResponse.redirect(new URL(`/${locale}/${status.next_step}`, request.url));
        }
      }
    } catch (error) {
      console.error('Proxy onboarding check failed:', error);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
