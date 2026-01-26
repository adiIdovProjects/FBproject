/**
 * CRITICAL: This file is required for next-intl routing to work.
 * DO NOT DELETE or MOVE this file!
 * Without it, navigation between pages will break (307 redirect to login).
 * Must be at project root (meta-dashboard/middleware.ts), NOT in src/.
 */
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'ar', 'he', 'fr', 'de'],

  // Used when no locale matches
  defaultLocale: 'en',

  // Automatically detect user's preferred locale
  localeDetection: true
});

export const config = {
  // Match all pathnames except for:
  // - /api routes
  // - /_next (Next.js internals)
  // - Static files
  matcher: ['/', '/(en|ar|he|fr|de)/:path*']
};
