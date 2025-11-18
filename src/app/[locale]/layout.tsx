import { I18nProvider } from '@/lib/i18n-provider';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'BOCalc - Car Shipping Calculator',
  description: 'Calculate the cost of shipping a car from USA',
  icons: {
    icon: '/favicon.svg',
  },
};

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'ru' },
    { locale: 'uk' },
  ];
}

// Synchronously import messages for static export
function getMessages(locale: string) {
  try {
    return require(`@/messages/${locale}.json`);
  } catch (error) {
    return require(`@/messages/en.json`);
  }
}

export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = getMessages(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <I18nProvider locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
