'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw, Edit3, Trash2, X, Eye } from 'lucide-react';
import { useTranslations } from '@/lib/i18n-provider';
import { apiClient } from '@/lib/api-client';
import { Vendor, VendorSettings } from '@/types';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { VendorDetailsPage } from './vendor-details-page';

interface VendorView
  extends Omit<Vendor, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

interface VendorFormState {
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl: string;
  active: boolean;
  settings: VendorSettings;
}

const defaultSettings: VendorSettings = {
  defaultCurrency: 'USD',
  defaultLanguage: 'ru',
  showBranding: true,
  emailNotifications: true,
  allowPublicCalculator: true,
  customDomain: '',
};

const emptyFormState = (): VendorFormState => ({
  name: '',
  slug: '',
  contactEmail: '',
  contactPhone: '',
  logoUrl: '',
  active: true,
  settings: { ...defaultSettings },
});

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export function VendorManager() {
  const t = useTranslations();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [vendors, setVendors] = useState<VendorView[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [form, setForm] = useState<VendorFormState>(emptyFormState());
  const [detailsVendorId, setDetailsVendorId] = useState<string | null>(null);
  const vendorScope = user?.vendorId || null;

  const canCreateVendor = isAdmin;

  const visibleVendors = useMemo(() => {
    if (isAdmin || !vendorScope) {
      return vendors;
    }

    return vendors.filter((vendor) => vendor.id === vendorScope);
  }, [vendors, isAdmin, vendorScope]);

  const filteredVendors = useMemo(() => {
    if (!search) {
      return visibleVendors;
    }

    const normalized = search.toLowerCase();
    return visibleVendors.filter(
      (vendor) =>
        vendor.name.toLowerCase().includes(normalized) ||
        vendor.slug.toLowerCase().includes(normalized) ||
        vendor.contactEmail.toLowerCase().includes(normalized),
    );
  }, [visibleVendors, search]);

  const canEditSelected =
    isAdmin ||
    (editingVendorId !== null &&
      vendorScope !== null &&
      vendorScope === editingVendorId);

  const actionLabel = editingVendorId
    ? t('vendors.editVendor')
    : t('vendors.createVendor');

  const loadVendors = async () => {
    setIsLoading(true);
    const response = await apiClient.vendors.list();

    if (response.success && response.data) {
      const normalized = (response.data as any[]).map(
        (vendor): VendorView => ({
          id: vendor.id,
          name: vendor.name,
          slug: vendor.slug,
          contactEmail: vendor.contactEmail,
          contactPhone: vendor.contactPhone || '',
          logoUrl: vendor.logoUrl || '',
          active: vendor.active,
          settings: {
            ...defaultSettings,
            ...vendor.settings,
          },
          createdAt: vendor.createdAt,
          updatedAt: vendor.updatedAt,
        }),
      );

      setVendors(normalized);

      if (!isAdmin && vendorScope) {
        const personalVendor = normalized.find(
          (vendor) => vendor.id === vendorScope,
        );
        if (personalVendor) {
          startEdit(personalVendor);
        }
      }
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (vendor: VendorView) => {
    setEditingVendorId(vendor.id);
    setForm({
      name: vendor.name,
      slug: vendor.slug,
      contactEmail: vendor.contactEmail,
      contactPhone: vendor.contactPhone || '',
      logoUrl: vendor.logoUrl || '',
      active: vendor.active,
      settings: {
        ...defaultSettings,
        ...vendor.settings,
      },
    });
  };

  const resetForm = () => {
    setEditingVendorId(null);
    setForm(emptyFormState());
  };

  const handleInputChange = (
    field: keyof Omit<VendorFormState, 'settings'>,
    value: string | boolean,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateSettings = <Key extends keyof VendorSettings>(
    key: Key,
    value: VendorSettings[Key],
  ) => {
    setForm((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }));
  };

  const validateForm = () => {
    if (!form.name.trim() || !form.contactEmail.trim()) {
      toast({
        variant: 'destructive',
        title: t('errors.validationError'),
        description: t('vendors.vendorName'),
      });
      return false;
    }

    if (!editingVendorId && !form.slug.trim()) {
      toast({
        variant: 'destructive',
        title: t('errors.validationError'),
        description: t('vendors.slug'),
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;
    if (editingVendorId && !canEditSelected) {
      toast({
        variant: 'destructive',
        title: t('errors.forbidden'),
      });
      return;
    }

    setIsSubmitting(true);

    const payload: Record<string, any> = {
      name: form.name.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim() || undefined,
      logoUrl: form.logoUrl.trim() || undefined,
      settings: {
        ...form.settings,
        customDomain: form.settings.customDomain?.trim(),
      },
    };

    if (isAdmin) {
      payload.active = form.active;
    }

    if (!editingVendorId) {
      payload.slug = form.slug.trim();
      const response = await apiClient.vendors.create(payload);
      finishMutation(response, t('vendors.vendorCreated'), true);
    } else {
      if (isAdmin && form.slug.trim()) {
        payload.slug = form.slug.trim();
      }
      const response = await apiClient.vendors.update(
        editingVendorId,
        payload,
      );
      finishMutation(response, t('vendors.vendorUpdated'), false);
    }

    setIsSubmitting(false);
  };

  const finishMutation = async (
    response: Awaited<ReturnType<typeof apiClient.vendors.create>>,
    successMessage: string,
    shouldReset: boolean,
  ) => {
    if (response.success) {
      toast({
        title: successMessage,
      });
      await loadVendors();
      if (shouldReset) {
        resetForm();
      }
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
  };

  const handleDeactivate = async (vendorId: string) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(t('vendors.deactivate'));
    if (!confirmed) return;

    const response = await apiClient.vendors.delete(vendorId);

    if (response.success) {
      toast({ title: t('vendors.vendorDeleted') });
      if (editingVendorId === vendorId) {
        resetForm();
      }
      loadVendors();
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('vendors.title')}</CardTitle>
            <CardDescription>{t('vendors.description')}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadVendors}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              {t('vendors.refresh')}
            </Button>
            {canCreateVendor && (
              <Button
                type="button"
                size="sm"
                onClick={resetForm}
                variant="outline"
              >
                <X className="mr-2 h-4 w-4" />
                {t('vendors.resetForm')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder={t('vendors.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t('vendors.noVendors')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2">{t('vendors.vendorName')}</th>
                    <th className="px-3 py-2">{t('vendors.statusLabel')}</th>
                    <th className="px-3 py-2">{t('vendors.contact')}</th>
                    <th className="px-3 py-2">{t('vendors.lastUpdated')}</th>
                    <th className="px-3 py-2 text-right">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className={cn(
                        'hover:bg-muted/30',
                        editingVendorId === vendor.id && 'bg-muted/40',
                      )}
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium">{vendor.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {vendor.slug}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            vendor.active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
                          )}
                        >
                          {vendor.active
                            ? t('common.active')
                            : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div>{vendor.contactEmail}</div>
                        {vendor.contactPhone && (
                          <div className="text-xs text-muted-foreground">
                            {vendor.contactPhone}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDate(vendor.updatedAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setDetailsVendorId(vendor.id)}
                          >
                            <Eye className="mr-1.5 h-4 w-4" />
                            {t('vendors.viewDetails')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(vendor)}
                          >
                            <Edit3 className="mr-1.5 h-4 w-4" />
                            {t('common.edit')}
                          </Button>
                          {isAdmin && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeactivate(vendor.id)}
                              disabled={!vendor.active}
                            >
                              <Trash2 className="mr-1.5 h-4 w-4" />
                              {t('vendors.deactivate')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{actionLabel}</CardTitle>
          <CardDescription>{t('vendors.settingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!isAdmin && vendorScope && (
            <div className="mb-6 rounded-md border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {t('vendors.restrictedNotice')}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('vendors.vendorName')}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    handleInputChange('name', event.target.value)
                  }
                  required
                  disabled={!canCreateVendor && !canEditSelected}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">{t('vendors.slug')}</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(event) =>
                    handleInputChange('slug', event.target.value)
                  }
                  required={!editingVendorId}
                  disabled={Boolean(editingVendorId && !isAdmin)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">
                  {t('vendors.contactEmail')}
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={(event) =>
                    handleInputChange('contactEmail', event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">
                  {t('vendors.contactPhone')}
                </Label>
                <Input
                  id="contactPhone"
                  value={form.contactPhone}
                  onChange={(event) =>
                    handleInputChange('contactPhone', event.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">{t('vendors.logo')}</Label>
              <Input
                id="logoUrl"
                value={form.logoUrl}
                onChange={(event) =>
                  handleInputChange('logoUrl', event.target.value)
                }
                placeholder="https://cdn.example.com/logo.png"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('vendors.defaultCurrency')}</Label>
                <Select
                  value={form.settings.defaultCurrency}
                  onValueChange={(value) =>
                    updateSettings(
                      'defaultCurrency',
                      value as VendorSettings['defaultCurrency'],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('vendors.defaultLanguage')}</Label>
                <Select
                  value={form.settings.defaultLanguage}
                  onValueChange={(value) =>
                    updateSettings(
                      'defaultLanguage',
                      value as VendorSettings['defaultLanguage'],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="uk">Українська</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('common.active')}</Label>
                <Select
                  value={form.active ? 'true' : 'false'}
                  onValueChange={(value) =>
                    handleInputChange('active', value === 'true')
                  }
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('common.active')}</SelectItem>
                    <SelectItem value="false">
                      {t('common.inactive')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="customDomain">{t('vendors.customDomain')}</Label>
                <Input
                  id="customDomain"
                  value={form.settings.customDomain || ''}
                  onChange={(event) =>
                    updateSettings('customDomain', event.target.value)
                  }
                  placeholder="myvendor.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('vendors.showBranding')}</Label>
                <Select
                  value={form.settings.showBranding ? 'true' : 'false'}
                  onValueChange={(value) =>
                    updateSettings('showBranding', value === 'true')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('common.yes')}</SelectItem>
                    <SelectItem value="false">{t('common.no')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('vendors.emailNotifications')}</Label>
                <Select
                  value={form.settings.emailNotifications ? 'true' : 'false'}
                  onValueChange={(value) =>
                    updateSettings('emailNotifications', value === 'true')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('common.yes')}</SelectItem>
                    <SelectItem value="false">{t('common.no')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('vendors.allowPublicCalculator')}</Label>
                <Select
                  value={form.settings.allowPublicCalculator ? 'true' : 'false'}
                  onValueChange={(value) =>
                    updateSettings('allowPublicCalculator', value === 'true')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('common.yes')}</SelectItem>
                    <SelectItem value="false">{t('common.no')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {canCreateVendor && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="mr-2 h-4 w-4" />
                  {t('vendors.resetForm')}
                </Button>
              )}
      <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingVendorId ? t('common.update') : t('common.create')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>

      <Dialog
        open={Boolean(detailsVendorId)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsVendorId(null);
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {detailsVendorId && (
            <VendorDetailsPage
              vendorId={detailsVendorId}
              onClose={() => setDetailsVendorId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


