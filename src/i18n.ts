// Minimal config for next-intl static export
import { notFound } from 'next/navigation';

export const locales = ['en', 'ru', 'uk'] as const;
export type Locale = (typeof locales)[number];

// This function is called during static generation
// It doesn't use headers() or cookies()
export default function getRequestConfig({ locale }: { locale: string }) {
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Load messages synchronously
  let messages;
  try {
    messages = require(`./messages/${locale}.json`);
  } catch (e) {
    messages = require(`./messages/en.json`);
  }

  return {
    locale,
    messages,
  };
}
