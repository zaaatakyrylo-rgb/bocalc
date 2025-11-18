'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, History, Trash2, Edit3 } from 'lucide-react';
import { useTranslations } from '@/lib/i18n-provider';
import { VendorRate, VersionRecord } from '@/types';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VersionHistory } from './version-history';

interface RateFormState {
  vendorId: string;
  rateType: string;
  name: string;
  description: string;
  baseValue: string;
  currency: string;
  effectiveAt: string;
  metadata: string;
}

const initialForm = (vendorId: string): RateFormState => ({
  vendorId,
  rateType: 'service_fee',
  name: '',
  description: '',
  baseValue: '',
  currency: 'USD',
  effectiveAt: new Date().toISOString().slice(0, 16),
  metadata: '',
});

export function VendorRatesManager() {
  const t = useTranslations();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [vendorFilter, setVendorFilter] = useState(() => user?.vendorId || '');
  const [vendorOptions, setVendorOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [rates, setRates] = useState<VendorRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RateFormState>(initialForm(user?.vendorId || ''));
  const [versions, setVersions] = useState<VersionRecord<any>[]>([]);
  const [versionsTarget, setVersionsTarget] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (isAdmin) {
      return Boolean(form.vendorId && form.name.trim());
    }
    return Boolean(form.name.trim());
  }, [form, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      apiClient.vendors
        .list()
        .then((res) => {
          if (res.success && res.data) {
            const payload = (res.data as any[]).map((vendor) => ({
              id: vendor.id,
              name: vendor.name,
            }));
            setVendorOptions(payload);
            if (!vendorFilter && payload.length) {
              setVendorFilter(payload[0].id);
              setForm((prev) => ({ ...prev, vendorId: payload[0].id }));
            }
          }
        })
        .catch(() => {
          /* noop */
        });
    }
  }, [isAdmin, vendorFilter]);

  useEffect(() => {
    if (!isAdmin && user?.vendorId) {
      setVendorFilter(user.vendorId);
      setForm((prev) => ({ ...prev, vendorId: user.vendorId }));
    }
  }, [isAdmin, user?.vendorId]);

  useEffect(() => {
    if (!vendorFilter) return;
    setForm((prev) => ({ ...prev, vendorId: vendorFilter }));
    loadRates(vendorFilter);
  }, [vendorFilter]);

  const loadRates = async (vendorId: string) => {
    setIsLoading(true);
    const response = await apiClient.vendorRates.list({ vendorId });
    if (response.success && response.data) {
      setRates(
        (response.data as any[]).map((rate) => ({
          ...rate,
          effectiveAt: new Date(rate.effectiveAt),
          createdAt: rate.createdAt ? new Date(rate.createdAt) : new Date(),
          updatedAt: rate.updatedAt ? new Date(rate.updatedAt) : new Date(),
        }))
      );
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
    setIsLoading(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);

    let metadataPayload: any = undefined;
    if (form.metadata.trim()) {
      try {
        metadataPayload = JSON.parse(form.metadata);
      } catch {
        toast({
          variant: 'destructive',
          title: t('errors.validationError'),
          description: 'Metadata must be valid JSON',
        });
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      vendorId: form.vendorId || user?.vendorId,
      rateType: form.rateType,
      name: form.name,
      description: form.description,
      baseValue: parseFloat(form.baseValue || '0'),
      currency: form.currency,
      effectiveAt: form.effectiveAt ? new Date(form.effectiveAt).toISOString() : undefined,
      metadata: metadataPayload,
    };

    const response = editingId
      ? await apiClient.vendorRates.update(editingId, payload)
      : await apiClient.vendorRates.create(payload);

    if (response.success) {
      toast({
        title: editingId ? t('vendors.vendorUpdated') : t('vendors.vendorCreated'),
      });
      setEditingId(null);
      setForm(initialForm(vendorFilter || user?.vendorId || ''));
      if (vendorFilter || payload.vendorId) {
        await loadRates(payload.vendorId);
      }
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }

    setIsSubmitting(false);
  };

  const handleEdit = (rate: VendorRate) => {
    setEditingId(rate.id);
    setForm({
      vendorId: rate.vendorId,
      rateType: rate.rateType,
      name: rate.name,
      description: rate.description || '',
      baseValue: rate.baseValue.toString(),
      currency: rate.currency,
      effectiveAt: rate.effectiveAt ? new Date(rate.effectiveAt).toISOString().slice(0, 16) : '',
      metadata: rate.metadata ? JSON.stringify(rate.metadata, null, 2) : '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('vendors.deactivate'))) return;
    const response = await apiClient.vendorRates.delete(id);
    if (response.success) {
      toast({ title: t('vendors.vendorDeleted') });
      if (vendorFilter) {
        await loadRates(vendorFilter);
      }
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
  };

  const openVersions = async (id: string) => {
    const response = await apiClient.vendorRates.versions(id);
    if (response.success && response.data) {
      setVersions(response.data as VersionRecord<any>[]);
      setVersionsTarget(id);
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
  };

  const restoreVersion = async (version: number) => {
    if (!versionsTarget) return;
    const response = await apiClient.vendorRates.restoreVersion(versionsTarget, version);
    if (response.success) {
      toast({ title: t('vendors.vendorUpdated') });
      setVersionsTarget(null);
      setVersions([]);
      if (vendorFilter) {
        await loadRates(vendorFilter);
      }
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
  };

  const currentVendorName =
    vendorOptions.find((vendor) => vendor.id === vendorFilter)?.name || vendorFilter;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t('vendors.title')} • Rates</CardTitle>
            <CardDescription>{t('vendors.description')}</CardDescription>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Label htmlFor="vendorFilter" className="text-sm">
                Vendor
              </Label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger id="vendorFilter" className="w-56">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendorOptions.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Base</th>
                    <th className="px-3 py-2">Effective</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-muted/40">
                      <td className="px-3 py-2 capitalize">{rate.rateType}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{rate.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {rate.description || currentVendorName}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {rate.baseValue.toFixed(2)} {rate.currency}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {rate.effectiveAt.toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            rate.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rate.active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(rate)}
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            {t('common.edit')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openVersions(rate.id)}
                          >
                            <History className="mr-2 h-4 w-4" />
                            {t('common.versions')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(rate.id)}
                            disabled={!rate.active}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('vendors.deactivate')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rates.length === 0 && (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  {t('vendors.noVendors')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {editingId ? t('vendors.editVendor') : t('vendors.createVendor')} – Rates
          </CardTitle>
          <CardDescription>
            Configure rate cards that will be used during calculator estimates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="vendorId">Vendor ID</Label>
                <Input
                  id="vendorId"
                  value={form.vendorId}
                  onChange={(event) => setForm({ ...form, vendorId: event.target.value })}
                  required
                />
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('vendors.vendorName')}</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Rate Type</Label>
                <Select
                  value={form.rateType}
                  onValueChange={(value) => setForm({ ...form, rateType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service_fee">Service Fee</SelectItem>
                    <SelectItem value="auction_fee">Auction Fee</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Base Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.baseValue}
                  onChange={(event) => setForm({ ...form, baseValue: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input
                  value={form.currency}
                  onChange={(event) => setForm({ ...form, currency: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Effective At</Label>
              <Input
                type="datetime-local"
                value={form.effectiveAt}
                onChange={(event) => setForm({ ...form, effectiveAt: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('vendors.settingsDescription')}</Label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Metadata (JSON)</Label>
              <Textarea
                value={form.metadata}
                onChange={(event) => setForm({ ...form, metadata: event.target.value })}
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting || !canSubmit}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? t('common.update') : t('common.create')}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm(initialForm(vendorFilter || user?.vendorId || ''));
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {versionsTarget && (
        <VersionHistory
          title={`Rate versions (${versionsTarget})`}
          versions={versions}
          onRestore={restoreVersion}
          onClose={() => {
            setVersionsTarget(null);
            setVersions([]);
          }}
          closeLabel={t('common.close')}
        />
      )}
    </div>
  );
}


