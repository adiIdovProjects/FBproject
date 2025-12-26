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
