'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/lib/i18n-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/lib/api-client';
import { VendorModifier } from '@/types';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
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

interface VendorModifiersListProps {
  vendorId: string;
}

export function VendorModifiersList({ vendorId }: VendorModifiersListProps) {
  const t = useTranslations('vendorModifiers');
  const { toast } = useToast();

  const [modifiers, setModifiers] = useState<VendorModifier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModifier, setEditingModifier] = useState<VendorModifier | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [modifierType, setModifierType] = useState('');
  const [modifierKey, setModifierKey] = useState('');
  const [oceanShippingModifier, setOceanShippingModifier] = useState('0');
  const [usaShippingModifier, setUsaShippingModifier] = useState('0');
  const [fixedAmount, setFixedAmount] = useState('0');
  const [percentage, setPercentage] = useState('0');

  useEffect(() => {
    loadModifiers();
  }, [vendorId]);

  const loadModifiers = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.vendorModifiers.list({ vendorId });
      if (response.success) {
        setModifiers((response.data as VendorModifier[]) || []);
      }
    } catch (error) {
      console.error('Failed to load modifiers:', error);
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
    setEditingModifier(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (modifier: VendorModifier) => {
    setEditingModifier(modifier);
    setModifierType(modifier.modifierType);
    setModifierKey(modifier.modifierKey);
    setOceanShippingModifier(modifier.oceanShippingModifier.toString());
    setUsaShippingModifier(modifier.usaShippingModifier.toString());
    setFixedAmount(modifier.fixedAmount.toString());
    setPercentage(modifier.percentage.toString());
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setModifierType('');
    setModifierKey('');
    setOceanShippingModifier('0');
    setUsaShippingModifier('0');
    setFixedAmount('0');
    setPercentage('0');
  };

  const handleSave = async () => {
    if (!modifierType || !modifierKey) {
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
        modifierType,
        modifierKey,
        oceanShippingModifier: parseFloat(oceanShippingModifier),
        usaShippingModifier: parseFloat(usaShippingModifier),
        fixedAmount: parseFloat(fixedAmount),
        percentage: parseFloat(percentage),
      };

      const response = editingModifier
        ? await apiClient.vendorModifiers.update(editingModifier.id, data)
        : await apiClient.vendorModifiers.create(data);

      if (response.success) {
        toast({
          title: t('success'),
          description: editingModifier ? t('modifierUpdated') : t('modifierCreated'),
        });
        setIsDialogOpen(false);
        loadModifiers();
      } else {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: response.error?.message || t('failedToSave'),
        });
      }
    } catch (error) {
      console.error('Failed to save modifier:', error);
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
      const response = await apiClient.vendorModifiers.delete(id);
      if (response.success) {
        toast({
          title: t('success'),
          description: t('modifierDeleted'),
        });
        loadModifiers();
      } else {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: response.error?.message || t('failedToDelete'),
        });
      }
    } catch (error) {
      console.error('Failed to delete modifier:', error);
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
              {t('addModifier')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {modifiers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('noModifiers')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('modifierType')}</TableHead>
                  <TableHead>{t('modifierKey')}</TableHead>
                  <TableHead>{t('oceanShipping')}</TableHead>
                  <TableHead>{t('usaShipping')}</TableHead>
                  <TableHead>{t('fixedAmount')}</TableHead>
                  <TableHead>{t('percentage')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modifiers.map((modifier) => (
                  <TableRow key={modifier.id}>
                    <TableCell className="font-medium">{modifier.modifierType}</TableCell>
                    <TableCell>{modifier.modifierKey}</TableCell>
                    <TableCell>${modifier.oceanShippingModifier}</TableCell>
                    <TableCell>${modifier.usaShippingModifier}</TableCell>
                    <TableCell>${modifier.fixedAmount}</TableCell>
                    <TableCell>{modifier.percentage}%</TableCell>
                    <TableCell>
                      {modifier.active ? (
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
                          onClick={() => openEditDialog(modifier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(modifier.id)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingModifier ? t('editModifier') : t('createModifier')}
            </DialogTitle>
            <DialogDescription>
              {editingModifier ? t('editModifierDescription') : t('createModifierDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modifierType">{t('modifierType')} *</Label>
                <Input
                  id="modifierType"
                  value={modifierType}
                  onChange={(e) => setModifierType(e.target.value)}
                  placeholder="body_type, damage_type, running_status"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modifierKey">{t('modifierKey')} *</Label>
                <Input
                  id="modifierKey"
                  value={modifierKey}
                  onChange={(e) => setModifierKey(e.target.value)}
                  placeholder="sedan, front_damage, not_running"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="oceanShippingModifier">{t('oceanShipping')}</Label>
                <Input
                  id="oceanShippingModifier"
                  type="number"
                  step="0.01"
                  value={oceanShippingModifier}
                  onChange={(e) => setOceanShippingModifier(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usaShippingModifier">{t('usaShipping')}</Label>
                <Input
                  id="usaShippingModifier"
                  type="number"
                  step="0.01"
                  value={usaShippingModifier}
                  onChange={(e) => setUsaShippingModifier(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

