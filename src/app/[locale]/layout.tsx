import { NextIntlClientProvider } from 'next-intl';
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

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Import messages directly for static export
  let messages;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch (error) {
    messages = (await import(`@/messages/en.json`)).default;
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}


