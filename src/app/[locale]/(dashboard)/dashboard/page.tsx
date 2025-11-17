import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const revalidate = 0;

export default async function DashboardPage() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">{t('nav.dashboard')}</p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t('common.appName')}
          </h1>
          <p className="text-base text-muted-foreground">
            Coming soon: vendor insights, audit activity, Sheets sync status, and calculator analytics.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>📊 KPI Widgets</CardTitle>
              <CardDescription>Real-time calculators, revenue, and sync statuses.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              We are wiring the data model for multi-vendor dashboards. Expect charts, filters, and quick actions.
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>📝 Audit Activity</CardTitle>
              <CardDescription>Latest changes across vendors, users, and pricing.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Completed backend endpoints; UI will surface them here after the next milestone.
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
            <CardDescription>
              Use the calculator or vendor management sections while the dashboard is being finished.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/calculator">{t('nav.calculator')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/vendors"> {t('nav.vendors')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


