'use client';

import { Suspense } from 'react';
import { useTranslations } from '@/lib/i18n-provider';
import { VendorRatesManager } from '@/components/dashboard/vendor-rates-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


export default function VendorRatesPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            {t('nav.vendors')}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Vendor Rates
          </h1>
          <p className="text-base text-muted-foreground">
            Manage base fees and specialized pricing logic per vendor.
          </p>
        </header>

        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>{t('common.loading')}</CardTitle>
              </CardHeader>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                {t('common.loading')}
              </CardContent>
            </Card>
          }
        >
          <VendorRatesManager />
        </Suspense>
      </div>
    </div>
  );
}


