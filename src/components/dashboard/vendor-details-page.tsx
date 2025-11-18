'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from '@/lib/i18n-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/lib/api-client';
import { Vendor } from '@/types';
import { VendorRatesList } from './vendor-rates-list';
import { VendorPortsList } from './vendor-ports-list';
import { VendorModifiersList } from './vendor-modifiers-list';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface VendorDetailsPageProps {
  vendorId: string;
}

export function VendorDetailsPage({ vendorId }: VendorDetailsPageProps) {
  const t = useTranslations('vendors');
  const locale = useLocale();
  const { toast } = useToast();
  const router = useRouter();
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [settings, setSettings] = useState('{}');

  useEffect(() => {
    loadVendor();
  }, [vendorId]);

  const loadVendor = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.vendors.get(vendorId);
      if (response.success && response.data) {
        const v = response.data as Vendor;
        setVendor(v);
        setName(v.name);
        setContactEmail(v.contactEmail);
        setContactPhone(v.contactPhone || '');
        setLogoUrl(v.logoUrl || '');
        setSettings(
          typeof v.settings === 'string' ? v.settings : JSON.stringify(v.settings, null, 2)
        );
      } else {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: t('vendorNotFound'),
        });
        router.push(`/${locale}/vendors`);
      }
    } catch (error) {
      console.error('Failed to load vendor:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('failedToLoadVendor'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!vendor) return;

    try {
      setIsSaving(true);

      let parsedSettings = {};
      try {
        parsedSettings = JSON.parse(settings);
      } catch {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: t('invalidSettingsJson'),
        });
        return;
      }

      const response = await apiClient.vendors.update(vendor.id, {
        name,
        contactEmail,
        contactPhone: contactPhone || undefined,
        logoUrl: logoUrl || undefined,
        settings: parsedSettings,
      });

      if (response.success) {
        toast({
          title: t('success'),
          description: t('vendorUpdated'),
        });
        loadVendor();
      } else {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: response.error?.message || t('failedToUpdateVendor'),
        });
      }
    } catch (error) {
      console.error('Failed to update vendor:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('failedToUpdateVendor'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!vendor) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${locale}/vendors`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToList')}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">{t('generalInfo')}</TabsTrigger>
          <TabsTrigger value="rates">{t('rates')}</TabsTrigger>
          <TabsTrigger value="ports">{t('ports')}</TabsTrigger>
          <TabsTrigger value="modifiers">{t('modifiers')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('generalInfo')}</CardTitle>
              <CardDescription>{t('generalInfoDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('name')} *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('namePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">{t('contactEmail')} *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={t('contactEmailPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">{t('contactPhone')}</Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder={t('contactPhonePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl">{t('logoUrl')}</Label>
                  <Input
                    id="logoUrl"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder={t('logoUrlPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings">{t('settings')} (JSON)</Label>
                <Textarea
                  id="settings"
                  value={settings}
                  onChange={(e) => setSettings(e.target.value)}
                  placeholder={t('settingsPlaceholder')}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('saveChanges')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <VendorRatesList vendorId={vendorId} />
        </TabsContent>

        <TabsContent value="ports">
          <VendorPortsList vendorId={vendorId} />
        </TabsContent>

        <TabsContent value="modifiers">
          <VendorModifiersList vendorId={vendorId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

