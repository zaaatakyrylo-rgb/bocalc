'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { VendorModifiersManager } from '@/components/dashboard/vendor-modifiers-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


export default function VendorModifiersPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            {t('nav.vendors')}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Vendor Modifiers
          </h1>
          <p className="text-base text-muted-foreground">
            Define adjustments for body types, damages, and special handling scenarios.
          </p>
        </header>

        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>{t('common.loading')}</CardTitle>
              </CardHeader>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {t('common.loading')}
              </CardContent>
            </Card>
          }
        >
          <VendorModifiersManager />
        </Suspense>
      </div>
    </div>
  );
}


