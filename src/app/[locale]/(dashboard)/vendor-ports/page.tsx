import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { VendorPortsManager } from '@/components/dashboard/vendor-ports-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const revalidate = 0;

export default async function VendorPortsPage() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            {t('nav.vendors')}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Vendor Ports
          </h1>
          <p className="text-base text-muted-foreground">
            Configure destination ports, ocean shipping baselines, and transit expectations.
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
          <VendorPortsManager />
        </Suspense>
      </div>
    </div>
  );
}


