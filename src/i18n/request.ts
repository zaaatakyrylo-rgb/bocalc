import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'ru', 'uk'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  
  // Fallback to 'en' if locale is not valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'en';
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});

