import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'BOCalc - Car Shipping Calculator',
  description: 'Calculate the cost of shipping a car from USA',
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
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}


