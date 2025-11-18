export const dynamic = "force-static";
'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { CalculationsManager } from '@/components/dashboard/calculations-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


export default function CalculationsPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            {t('nav.dashboard')}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Calculations
          </h1>
          <p className="text-base text-muted-foreground">
            Audit, edit, and archive stored calculator runs per vendor.
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
          <CalculationsManager />
        </Suspense>
      </div>
    </div>
  );
}


