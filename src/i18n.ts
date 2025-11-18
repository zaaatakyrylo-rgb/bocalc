// Dummy config file to satisfy next-intl - actual localization happens client-side in layout
export const locales = ['en', 'ru', 'uk'] as const;
export type Locale = (typeof locales)[number];

