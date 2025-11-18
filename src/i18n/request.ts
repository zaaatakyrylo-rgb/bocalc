// Simple configuration for next-intl without server-side rendering
export const locales = ['en', 'ru', 'uk'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ru';

