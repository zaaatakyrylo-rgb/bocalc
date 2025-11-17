'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/lib/api-client';
import { VendorPort } from '@/types';
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

interface VendorPortsListProps {
  vendorId: string;
}

export function VendorPortsList({ vendorId }: VendorPortsListProps) {
  const t = useTranslations('vendorPorts');
  const { toast } = useToast();

  const [ports, setPorts] = useState<VendorPort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPort, setEditingPort] = useState<VendorPort | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [baseOceanShipping, setBaseOceanShipping] = useState('');
  const [inlandShipping, setInlandShipping] = useState('0');
  const [transitTimeDays, setTransitTimeDays] = useState('');

  useEffect(() => {
    loadPorts();
  }, [vendorId]);

  const loadPorts = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.vendorPorts.list({ vendorId });
      if (response.success) {
        setPorts(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load ports:', error);
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
    setEditingPort(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (port: VendorPort) => {
    setEditingPort(port);
    setName(port.name);
    setCountry(port.country);
    setCity(port.city);
    setBaseOceanShipping(port.baseOceanShipping.toString());
    setInlandShipping(port.inlandShipping.toString());
    setTransitTimeDays(port.transitTimeDays?.toString() || '');
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setName('');
    setCountry('');
    setCity('');
    setBaseOceanShipping('');
    setInlandShipping('0');
    setTransitTimeDays('');
  };

  const handleSave = async () => {
    if (!name || !country || !city || !baseOceanShipping) {
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
        name,
        country,
        city,
        baseOceanShipping: parseFloat(baseOceanShipping),
        inlandShipping: parseFloat(inlandShipping),
        transitTimeDays: transitTimeDays ? parseInt(transitTimeDays) : undefined,
      };

      const response = editingPort
        ? await apiClient.vendorPorts.update(editingPort.id, data)
        : await apiClient.vendorPorts.create(data);

      if (response.success) {
        toast({
          title: t('success'),
          description: editingPort ? t('portUpdated') : t('portCreated'),
        });
        setIsDialogOpen(false);
        loadPorts();
      } else {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: response.error?.message || t('failedToSave'),
        });
      }
    } catch (error) {
      console.error('Failed to save port:', error);
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
      const response = await apiClient.vendorPorts.delete(id);
      if (response.success) {
        toast({
          title: t('success'),
          description: t('portDeleted'),
        });
        loadPorts();
      } else {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: response.error?.message || t('failedToDelete'),
        });
      }
    } catch (error) {
      console.error('Failed to delete port:', error);
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
              {t('addPort')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {ports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('noPorts')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('location')}</TableHead>
                  <TableHead>{t('baseOceanShipping')}</TableHead>
                  <TableHead>{t('inlandShipping')}</TableHead>
                  <TableHead>{t('transitTime')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ports.map((port) => (
                  <TableRow key={port.id}>
                    <TableCell className="font-medium">{port.name}</TableCell>
                    <TableCell>
                      {port.city}, {port.country}
                    </TableCell>
                    <TableCell>${port.baseOceanShipping}</TableCell>
                    <TableCell>${port.inlandShipping}</TableCell>
                    <TableCell>
                      {port.transitTimeDays ? `${port.transitTimeDays} ${t('days')}` : '-'}
                    </TableCell>
                    <TableCell>
                      {port.active ? (
                        <span className="text-green-600">{t('active')}</span>
                      ) : (
                        <span className="text-gray-400">{t('inactive')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(port)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(port.id)}>
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
            <DialogTitle>{editingPort ? t('editPort') : t('createPort')}</DialogTitle>
            <DialogDescription>
              {editingPort ? t('editPortDescription') : t('createPortDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">{t('country')} *</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder={t('countryPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">{t('city')} *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t('cityPlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseOceanShipping">{t('baseOceanShipping')} *</Label>
                <Input
                  id="baseOceanShipping"
                  type="number"
                  step="0.01"
                  value={baseOceanShipping}
                  onChange={(e) => setBaseOceanShipping(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inlandShipping">{t('inlandShipping')}</Label>
                <Input
                  id="inlandShipping"
                  type="number"
                  step="0.01"
                  value={inlandShipping}
                  onChange={(e) => setInlandShipping(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transitTimeDays">{t('transitTime')}</Label>
                <Input
                  id="transitTimeDays"
                  type="number"
                  value={transitTimeDays}
                  onChange={(e) => setTransitTimeDays(e.target.value)}
                  placeholder={t('days')}
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

