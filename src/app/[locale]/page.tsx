export const dynamic = "force-static";
'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            {t('common.appName')}
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            {t('calculator.subtitle')}
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button size="lg" asChild>
              <Link href="/calculator">{t('calculator.title')}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">{t('nav.login')}</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>🚗 {t('calculator.title')}</CardTitle>
              <CardDescription>
                Calculate shipping costs from USA auctions to your destination port
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get accurate estimates including auction fees, USA shipping, ocean transport, and customs clearance.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🌍 Multi-Vendor Support</CardTitle>
              <CardDescription>
                Customizable pricing for each shipping vendor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Each vendor can have custom rates, ports, and pricing rules tailored to their business.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📊 Google Sheets Integration</CardTitle>
              <CardDescription>
                Easy data management through spreadsheets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Update pricing, ports, and rules directly in Google Sheets with automatic synchronization.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📝 Audit Trail</CardTitle>
              <CardDescription>
                Complete history of all changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track every change made to pricing, users, and settings with detailed audit logs.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🔐 Role-Based Access</CardTitle>
              <CardDescription>
                Admin, Vendor, and Viewer roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Granular permissions ensure users only access what they need to.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🌐 Multi-Language</CardTitle>
              <CardDescription>
                English, Russian, and Ukrainian
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Full interface translation for international users.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Ready to calculate shipping costs?
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Start using our calculator now or create an account for advanced features.
          </p>
          <div className="mt-8 flex items-center justify-center gap-x-6">
            <Button size="lg" asChild>
              <Link href="/calculator">{t('calculator.calculate')}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/register">{t('auth.register')}</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-24 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            © 2025 BOCalc. Powered by Cloudflare.
          </p>
        </div>
      </footer>
    </div>
  );
}


