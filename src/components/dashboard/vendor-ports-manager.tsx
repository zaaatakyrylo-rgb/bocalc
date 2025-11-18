'use client';

import { useEffect, useState } from 'react';
import { Loader2, Edit3, Trash2, History } from 'lucide-react';
import { useTranslations } from '@/lib/i18n-provider';
import { VendorPort, VersionRecord } from '@/types';
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

interface PortFormState {
  vendorId: string;
  name: string;
  country: string;
  city: string;
  baseOceanShipping: string;
  inlandShipping: string;
  currency: string;
  transitTimeDays: string;
  metadata: string;
}

const initialForm = (vendorId: string): PortFormState => ({
  vendorId,
  name: '',
  country: '',
  city: '',
  baseOceanShipping: '',
  inlandShipping: '',
  currency: 'USD',
  transitTimeDays: '',
  metadata: '',
});

export function VendorPortsManager() {
  const t = useTranslations();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [vendorOptions, setVendorOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [vendorFilter, setVendorFilter] = useState(() => user?.vendorId || '');
  const [ports, setPorts] = useState<VendorPort[]>([]);
  const [form, setForm] = useState<PortFormState>(initialForm(user?.vendorId || ''));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [versions, setVersions] = useState<VersionRecord<any>[]>([]);
  const [versionsTarget, setVersionsTarget] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      apiClient.vendors.list().then((res) => {
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
    loadPorts(vendorFilter);
  }, [vendorFilter]);

  const loadPorts = async (vendorId: string) => {
    setIsLoading(true);
    const response = await apiClient.vendorPorts.list({ vendorId });
    if (response.success && response.data) {
      setPorts(response.data as VendorPort[]);
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
    setIsSubmitting(true);

    let metadataPayload;
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
      name: form.name,
      country: form.country,
      city: form.city,
      baseOceanShipping: parseFloat(form.baseOceanShipping || '0'),
      inlandShipping: parseFloat(form.inlandShipping || '0'),
      currency: form.currency,
      transitTimeDays: form.transitTimeDays ? Number(form.transitTimeDays) : undefined,
      metadata: metadataPayload,
    };

    const response = editingId
      ? await apiClient.vendorPorts.update(editingId, payload)
      : await apiClient.vendorPorts.create(payload);

    if (response.success) {
      toast({
        title: editingId ? t('vendors.vendorUpdated') : t('vendors.vendorCreated'),
      });
      setEditingId(null);
      setForm(initialForm(vendorFilter || user?.vendorId || ''));
      if (vendorFilter) {
        await loadPorts(vendorFilter);
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

  const handleEdit = (port: VendorPort) => {
    setEditingId(port.id);
    setForm({
      vendorId: port.vendorId,
      name: port.name,
      country: port.country,
      city: port.city,
      baseOceanShipping: port.baseOceanShipping.toString(),
      inlandShipping: port.inlandShipping.toString(),
      currency: port.currency,
      transitTimeDays: port.transitTimeDays ? port.transitTimeDays.toString() : '',
      metadata: port.metadata ? JSON.stringify(port.metadata, null, 2) : '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('vendors.deactivate'))) return;
    const response = await apiClient.vendorPorts.delete(id);
    if (response.success) {
      toast({ title: t('vendors.vendorDeleted') });
      if (vendorFilter) {
        await loadPorts(vendorFilter);
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
    const response = await apiClient.vendorPorts.versions(id);
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
    const response = await apiClient.vendorPorts.restoreVersion(versionsTarget, version);
    if (response.success) {
      toast({ title: t('vendors.vendorUpdated') });
      setVersionsTarget(null);
      setVersions([]);
      if (vendorFilter) {
        await loadPorts(vendorFilter);
      }
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Vendor Ports</CardTitle>
            <CardDescription>Port-specific pricing and transit details.</CardDescription>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Label htmlFor="vendorPortFilter">Vendor</Label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger id="vendorPortFilter" className="w-56">
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
                    <th className="px-3 py-2">Port</th>
                    <th className="px-3 py-2">Shipping</th>
                    <th className="px-3 py-2">Transit</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ports.map((port) => (
                    <tr key={port.id} className="hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <div className="font-medium">{port.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {port.city}, {port.country}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        ${port.baseOceanShipping.toFixed(0)} ocean / ${port.inlandShipping.toFixed(0)} inland
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {port.transitTimeDays ? `${port.transitTimeDays} days` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            port.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {port.active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(port)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            {t('common.edit')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openVersions(port.id)}>
                            <History className="mr-2 h-4 w-4" />
                            {t('common.versions')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(port.id)}
                            disabled={!port.active}
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
              {!ports.length && (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  No ports yet.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit port' : 'Create port'}</CardTitle>
          <CardDescription>Ports define ocean and inland shipping defaults.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label>Vendor ID</Label>
                <Input
                  value={form.vendorId}
                  onChange={(event) => setForm({ ...form, vendorId: event.target.value })}
                  required
                />
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={form.country}
                  onChange={(event) => setForm({ ...form, country: event.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(event) => setForm({ ...form, city: event.target.value })}
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Base ocean shipping</Label>
                <Input
                  type="number"
                  value={form.baseOceanShipping}
                  onChange={(event) =>
                    setForm({ ...form, baseOceanShipping: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Inland shipping</Label>
                <Input
                  type="number"
                  value={form.inlandShipping}
                  onChange={(event) => setForm({ ...form, inlandShipping: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Transit time (days)</Label>
              <Input
                type="number"
                value={form.transitTimeDays}
                onChange={(event) => setForm({ ...form, transitTimeDays: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Metadata (JSON)</Label>
              <Textarea
                value={form.metadata}
                onChange={(event) => setForm({ ...form, metadata: event.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting || !form.name || !form.vendorId}>
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
          title={`Port versions (${versionsTarget})`}
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


