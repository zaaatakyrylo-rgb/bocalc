import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { VendorManager } from '@/components/dashboard/vendor-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const revalidate = 0;

export default async function VendorsPage() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-slate-900 dark:to-black px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            {t('nav.vendors')}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t('vendors.title')}
          </h1>
          <p className="text-base text-muted-foreground">{t('vendors.description')}</p>
        </header>

        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>{t('vendors.title')}</CardTitle>
              </CardHeader>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {t('common.loading')}
              </CardContent>
            </Card>
          }
        >
          <VendorManager />
        </Suspense>
      </div>
    </div>
  );
}
