'use client';

import { useEffect, useState } from 'react';
import { Loader2, Edit3, Trash2, History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { VendorModifier, VersionRecord } from '@/types';
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

interface ModifierFormState {
  vendorId: string;
  modifierType: string;
  target: string;
  oceanModifier: string;
  usaModifier: string;
  notes: string;
  metadata: string;
}

const initialForm = (vendorId: string): ModifierFormState => ({
  vendorId,
  modifierType: 'body_type',
  target: '',
  oceanModifier: '',
  usaModifier: '',
  notes: '',
  metadata: '',
});

export function VendorModifiersManager() {
  const t = useTranslations();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [vendorOptions, setVendorOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [vendorFilter, setVendorFilter] = useState(() => user?.vendorId || '');
  const [modifiers, setModifiers] = useState<VendorModifier[]>([]);
  const [form, setForm] = useState<ModifierFormState>(initialForm(user?.vendorId || ''));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [versions, setVersions] = useState<VersionRecord<any>[]>([]);
  const [versionsTarget, setVersionsTarget] = useState<string | null>(null);
  const versionVisible = Boolean(versionsTarget);

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
    loadModifiers(vendorFilter);
  }, [vendorFilter]);

  const loadModifiers = async (vendorId: string) => {
    setIsLoading(true);
    const response = await apiClient.vendorModifiers.list({ vendorId });
    if (response.success && response.data) {
      setModifiers(response.data as VendorModifier[]);
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
      modifierType: form.modifierType,
      target: form.target,
      oceanModifier: parseFloat(form.oceanModifier || '0'),
      usaModifier: parseFloat(form.usaModifier || '0'),
      notes: form.notes,
      metadata: metadataPayload,
    };

    const response = editingId
      ? await apiClient.vendorModifiers.update(editingId, payload)
      : await apiClient.vendorModifiers.create(payload);

    if (response.success) {
      toast({
        title: editingId ? t('vendors.vendorUpdated') : t('vendors.vendorCreated'),
      });
      setEditingId(null);
      setForm(initialForm(vendorFilter || user?.vendorId || ''));
      if (vendorFilter) {
        await loadModifiers(vendorFilter);
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

  const handleEdit = (modifier: VendorModifier) => {
    setEditingId(modifier.id);
    setForm({
      vendorId: modifier.vendorId,
      modifierType: modifier.modifierType,
      target: modifier.target,
      oceanModifier: modifier.oceanModifier.toString(),
      usaModifier: modifier.usaModifier.toString(),
      notes: modifier.notes || '',
      metadata: modifier.metadata ? JSON.stringify(modifier.metadata, null, 2) : '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('vendors.deactivate'))) return;
    const response = await apiClient.vendorModifiers.delete(id);
    if (response.success) {
      toast({ title: t('vendors.vendorDeleted') });
      if (vendorFilter) await loadModifiers(vendorFilter);
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
  };

  const openVersions = async (id: string) => {
    const response = await apiClient.vendorModifiers.versions(id);
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
    const response = await apiClient.vendorModifiers.restoreVersion(versionsTarget, version);
    if (response.success) {
      toast({ title: t('vendors.vendorUpdated') });
      setVersionsTarget(null);
      setVersions([]);
      if (vendorFilter) await loadModifiers(vendorFilter);
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
            <CardTitle>Vendor Modifiers</CardTitle>
            <CardDescription>Adjustments applied to calculators for specific scenarios.</CardDescription>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Label htmlFor="modifierVendor">Vendor</Label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger id="modifierVendor" className="w-56">
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
                    <th className="px-3 py-2">Target</th>
                    <th className="px-3 py-2">Adjustments</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {modifiers.map((modifier) => (
                    <tr key={modifier.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 capitalize">{modifier.modifierType}</td>
                      <td className="px-3 py-2">{modifier.target}</td>
                      <td className="px-3 py-2">
                        +${modifier.oceanModifier.toFixed(0)} ocean / +$
                        {modifier.usaModifier.toFixed(0)} USA
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            modifier.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {modifier.active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(modifier)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            {t('common.edit')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openVersions(modifier.id)}>
                            <History className="mr-2 h-4 w-4" />
                            {t('common.versions')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(modifier.id)}
                            disabled={!modifier.active}
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
              {!modifiers.length && (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  No modifiers yet.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit modifier' : 'Create modifier'}</CardTitle>
          <CardDescription>Define add-ons for specific body types, damages, or scenarios.</CardDescription>
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
                <Label>Modifier type</Label>
                <Select
                  value={form.modifierType}
                  onValueChange={(value) => setForm({ ...form, modifierType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="body_type">Body Type</SelectItem>
                    <SelectItem value="damage_type">Damage</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target</Label>
                <Input
                  value={form.target}
                  onChange={(event) => setForm({ ...form, target: event.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Ocean modifier</Label>
                <Input
                  type="number"
                  value={form.oceanModifier}
                  onChange={(event) => setForm({ ...form, oceanModifier: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>USA modifier</Label>
                <Input
                  type="number"
                  value={form.usaModifier}
                  onChange={(event) => setForm({ ...form, usaModifier: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Metadata (JSON)</Label>
              <Textarea
                rows={3}
                value={form.metadata}
                onChange={(event) => setForm({ ...form, metadata: event.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting || !form.target}>
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

      {versionVisible && (
        <VersionHistory
          title={`Modifier versions (${versionsTarget})`}
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


