'use client';

import { useEffect, useState } from 'react';
import { Loader2, Edit3, Trash2, History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CalculationSummary, VersionRecord } from '@/types';
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

interface CalculationFormState {
  id: string;
  vendorId: string;
  totalAmount: string;
  currency: string;
  validUntil: string;
  inputData: string;
  resultData: string;
}

const emptyForm = (vendorId: string): CalculationFormState => ({
  id: '',
  vendorId,
  totalAmount: '',
  currency: 'USD',
  validUntil: new Date().toISOString().slice(0, 16),
  inputData: '',
  resultData: '',
});

export function CalculationsManager() {
  const t = useTranslations();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [vendorOptions, setVendorOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [vendorFilter, setVendorFilter] = useState(() => user?.vendorId || '');
  const [calculations, setCalculations] = useState<CalculationSummary[]>([]);
  const [selected, setSelected] = useState<CalculationFormState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [versionsTarget, setVersionsTarget] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionRecord<any>[]>([]);

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
          }
        }
      });
    }
  }, [isAdmin, vendorFilter]);

  useEffect(() => {
    if (!isAdmin && user?.vendorId) {
      setVendorFilter(user.vendorId);
    }
  }, [isAdmin, user?.vendorId]);

  useEffect(() => {
    if (!vendorFilter && !isAdmin) return;
    loadCalculations(vendorFilter || user?.vendorId || '');
  }, [vendorFilter]);

  const loadCalculations = async (vendorId: string) => {
    if (!vendorId) return;
    setIsLoading(true);
    const response = await apiClient.calculator.list({ vendorId, limit: 50 });
    if (response.success && response.data) {
      setCalculations(
        (response.data as any[]).map((row) => ({
          ...row,
          createdAt: new Date(row.createdAt),
          updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
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

  const loadCalculation = async (id: string) => {
    const response = await apiClient.calculator.get(id);
    if (response.success && response.data) {
      const result = response.data as any;
      setSelected({
        id,
        vendorId: result.vendorId || vendorFilter || user?.vendorId || '',
        totalAmount: result.total.toString(),
        currency: result.currency,
        validUntil: result.validUntil ? new Date(result.validUntil).toISOString().slice(0, 16) : '',
        inputData: JSON.stringify(result.inputData ?? {}, null, 2),
        resultData: JSON.stringify(result, null, 2),
      });
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setIsSubmitting(true);

    let inputPayload = undefined;
    let resultPayload = undefined;
    try {
      inputPayload = selected.inputData ? JSON.parse(selected.inputData) : undefined;
      resultPayload = selected.resultData ? JSON.parse(selected.resultData) : undefined;
    } catch {
      toast({
        variant: 'destructive',
        title: t('errors.validationError'),
        description: 'Input/result data must be valid JSON',
      });
      setIsSubmitting(false);
      return;
    }

    const response = await apiClient.calculator.update(selected.id, {
      totalAmount: parseFloat(selected.totalAmount || '0'),
      currency: selected.currency,
      validUntil: selected.validUntil ? new Date(selected.validUntil).toISOString() : undefined,
      inputData: inputPayload,
      resultData: resultPayload,
    });

    if (response.success) {
      toast({ title: t('vendors.vendorUpdated') });
      await loadCalculations(selected.vendorId);
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
    setIsSubmitting(false);
  };

  const handleArchive = async (id: string, vendorId: string) => {
    if (!confirm('Archive calculation?')) return;
    const response = await apiClient.calculator.delete(id);
    if (response.success) {
      toast({ title: 'Calculation archived' });
      await loadCalculations(vendorId);
      if (selected?.id === id) {
        setSelected(null);
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
    const response = await apiClient.calculator.versions(id);
    if (response.success && response.data) {
      setVersionsTarget(id);
      setVersions(response.data as VersionRecord<any>[]);
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
    const response = await apiClient.calculator.restoreVersion(versionsTarget, version);
    if (response.success) {
      toast({ title: 'Version restored' });
      setVersionsTarget(null);
      setVersions([]);
      await loadCalculations(vendorFilter || user?.vendorId || '');
    } else {
      toast({
        variant: 'destructive',
        title: t('errors.generic'),
        description: response.error?.message,
      });
    }
  };

  if (!vendorFilter && !isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calculations</CardTitle>
          <CardDescription>{t('errors.forbidden')}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Vendor access is required to view calculations.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Calculations</CardTitle>
            <CardDescription>Review and adjust saved estimates.</CardDescription>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Label>Vendor</Label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-60">
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
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {calculations.map((calc) => (
                    <tr key={calc.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2">{calc.id}</td>
                      <td className="px-3 py-2">
                        {calc.totalAmount.toFixed(2)} {calc.currency}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(calc.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => loadCalculation(calc.id)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openVersions(calc.id)}>
                            <History className="mr-2 h-4 w-4" />
                            {t('common.versions')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleArchive(calc.id, calc.vendorId)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Archive
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!calculations.length && (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  No calculations found.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>Edit calculation</CardTitle>
            <CardDescription>Update stored payloads and totals.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Total amount</Label>
                  <Input
                    type="number"
                    value={selected.totalAmount}
                    onChange={(event) =>
                      setSelected({ ...selected, totalAmount: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={selected.currency}
                    onChange={(event) =>
                      setSelected({ ...selected, currency: event.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Valid until</Label>
                <Input
                  type="datetime-local"
                  value={selected.validUntil}
                  onChange={(event) =>
                    setSelected({ ...selected, validUntil: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Input data (JSON)</Label>
                <Textarea
                  rows={6}
                  value={selected.inputData}
                  onChange={(event) =>
                    setSelected({ ...selected, inputData: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Result data (JSON)</Label>
                <Textarea
                  rows={6}
                  value={selected.resultData}
                  onChange={(event) =>
                    setSelected({ ...selected, resultData: event.target.value })
                  }
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('common.update')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {versionsTarget && (
        <VersionHistory
          title={`Calculation versions (${versionsTarget})`}
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


