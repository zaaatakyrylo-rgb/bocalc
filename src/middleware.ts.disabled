import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'ru', 'uk'],

  // Used when no locale matches
  defaultLocale: 'ru',

  // Always use locale prefix in the URL
  localePrefix: 'always',
});

export const config = {
  // Run middleware on all app routes (excluding internal assets) so we can
  // redirect paths like /login -> /ru/login automatically.
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};


