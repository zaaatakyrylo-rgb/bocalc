'use client';

import { useTranslations, useLocale } from '@/lib/i18n-provider';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold text-center">
            {t('auth.forgotPassword')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('auth.resetInstructions')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{t('auth.resetComingSoon')}</p>
          <p>
            {t('auth.resetContactSupport')}{' '}
            <a
              className="text-primary underline"
              href="mailto:support@bocalc.com"
            >
              support@bocalc.com
            </a>
          </p>
          <Button asChild className="w-full">
            <Link href={`/${locale}/login`}>{t('nav.backToLogin')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

