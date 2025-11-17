'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/lib/api-client';
import { VendorRate } from '@/types';
import { Plus, Edit, Trash2, Loader2, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface VendorRatesListProps {
  vendorId: string;
}

export function VendorRatesList({ vendorId }: VendorRatesListProps) {
  const t = useTranslations('vendorRates');
  const { toast } = useToast();

  const [rates, setRates] = useState<VendorRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<VendorRate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [rateType, setRateType] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [effectiveAt, setEffectiveAt] = useState('');

  useEffect(() => {
    loadRates();
  }, [vendorId]);

  const loadRates = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.vendorRates.list({ vendorId });
      if (response.success) {
        setRates(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load rates:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('failedToLoad'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingRate(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (rate: VendorRate) => {
    setEditingRate(rate);
    setRateType(rate.rateType);
    setMinValue(rate.minValue?.toString() || '');
    setMaxValue(rate.maxValue?.toString() || '');
    setFixedAmount(rate.fixedAmount?.toString() || '');
    setPercentage(rate.percentage?.toString() || '');
    setUnitPrice(rate.unitPrice?.toString() || '');
    setCurrency(rate.currency);
    setEffectiveAt(new Date(rate.effectiveAt).toISOString().split('T')[0]);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setRateType('');
    setMinValue('');
    setMaxValue('');
    setFixedAmount('');
    setPercentage('');
    setUnitPrice('');
    setCurrency('USD');
    setEffectiveAt(new Date().toISOString().split('T')[0]);
  };

  const handleSave = async () => {
    if (!rateType || !effectiveAt) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('fillRequired'),
      });
      return;
    }

    try {
      setIsSaving(true);

      const data = {
        vendorId,
        rateType,
        minValue: minValue ? parseFloat(minValue) : undefined,
        maxValue: maxValue ? parseFloat(maxValue) : undefined,
        fixedAmount: fixedAmount ? parseFloat(fixedAmount) : undefined,
        percentage: percentage ? parseFloat(percentage) : undefined,
        unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
        currency,
        effectiveAt: new Date(effectiveAt).toISOString(),
      };

      const response = editingRate
        ? await apiClient.vendorRates.update(editingRate.id, data)
        : await apiClient.vendorRates.create(data);

      if (response.success) {
        toast({
          title: t('success'),
          description: editingRate ? t('rateUpdated') : t('rateCreated'),
        });
        setIsDialogOpen(false);
        loadRates();
      } else {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: response.error?.message || t('failedToSave'),
        });
      }
    } catch (error) {
      console.error('Failed to save rate:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('failedToSave'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      const response = await apiClient.vendorRates.delete(id);
      if (response.success) {
        toast({
          title: t('success'),
          description: t('rateDeleted'),
        });
        loadRates();
      } else {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: response.error?.message || t('failedToDelete'),
        });
      }
    } catch (error) {
      console.error('Failed to delete rate:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('failedToDelete'),
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addRate')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('noRates')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('rateType')}</TableHead>
                  <TableHead>{t('range')}</TableHead>
                  <TableHead>{t('fixedAmount')}</TableHead>
                  <TableHead>{t('percentage')}</TableHead>
                  <TableHead>{t('unitPrice')}</TableHead>
                  <TableHead>{t('currency')}</TableHead>
                  <TableHead>{t('effectiveAt')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.rateType}</TableCell>
                    <TableCell>
                      {rate.minValue !== undefined && rate.maxValue !== undefined
                        ? `${rate.minValue} - ${rate.maxValue}`
                        : '-'}
                    </TableCell>
                    <TableCell>{rate.fixedAmount !== undefined ? rate.fixedAmount : '-'}</TableCell>
                    <TableCell>{rate.percentage !== undefined ? `${rate.percentage}%` : '-'}</TableCell>
                    <TableCell>{rate.unitPrice !== undefined ? rate.unitPrice : '-'}</TableCell>
                    <TableCell>{rate.currency}</TableCell>
                    <TableCell>{new Date(rate.effectiveAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {rate.active ? (
                        <span className="text-green-600">{t('active')}</span>
                      ) : (
                        <span className="text-gray-400">{t('inactive')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(rate)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rate.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRate ? t('editRate') : t('createRate')}</DialogTitle>
            <DialogDescription>
              {editingRate ? t('editRateDescription') : t('createRateDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rateType">{t('rateType')} *</Label>
              <Input
                id="rateType"
                value={rateType}
                onChange={(e) => setRateType(e.target.value)}
                placeholder="auction_fee, usa_shipping_base, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minValue">{t('minValue')}</Label>
                <Input
                  id="minValue"
                  type="number"
                  step="0.01"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxValue">{t('maxValue')}</Label>
                <Input
                  id="maxValue"
                  type="number"
                  step="0.01"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fixedAmount">{t('fixedAmount')}</Label>
                <Input
                  id="fixedAmount"
                  type="number"
                  step="0.01"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="percentage">{t('percentage')}</Label>
                <Input
                  id="percentage"
                  type="number"
                  step="0.01"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitPrice">{t('unitPrice')}</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">{t('currency')}</Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="USD"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="effectiveAt">{t('effectiveAt')} *</Label>
                <Input
                  id="effectiveAt"
                  type="date"
                  value={effectiveAt}
                  onChange={(e) => setEffectiveAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

