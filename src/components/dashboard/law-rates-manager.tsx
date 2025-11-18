'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Edit3, XCircle, History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LawVariableType {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  active: boolean;
}

interface LawRate {
  id: string;
  variableTypeId: string;
  variableCode: string;
  variableName: string;
  rateName: string;
  fuelType?: string;
  volumeMin?: number;
  volumeMax?: number;
  ageMin?: number;
  ageMax?: number;
  rateValue: number;
  rateUnit: string;
  legalReference?: string;
  description?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}

interface ExchangeRate {
  id: string;
  variableTypeId: string;
  variableCode: string;
  variableName: string;
  rateName: string;
  rateValue: number;
  rateDate: string;
  source?: string;
  createdAt: string;
}

export function LawRatesManager() {
  const t = useTranslations();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [variableTypes, setVariableTypes] = useState<LawVariableType[]>([]);
  const [lawRates, setLawRates] = useState<LawRate[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('law-rates');

  // Form state for law rates
  const [rateForm, setRateForm] = useState({
    variableTypeId: '',
    rateName: '',
    fuelType: '',
    volumeMin: '',
    volumeMax: '',
    ageMin: '',
    ageMax: '',
    rateValue: '',
    rateUnit: 'percent',
    legalReference: '',
    description: '',
    effectiveFrom: new Date().toISOString().slice(0, 10),
  });

  // Form state for exchange rates
  const [exchangeForm, setExchangeForm] = useState({
    variableTypeId: '',
    rateName: '',
    rateValue: '',
    rateDate: new Date().toISOString().slice(0, 10),
    source: 'manual',
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only administrators can manage legislative variables',
      });
      return;
    }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load variable types
      const typesResponse = await fetch('/api/law-variable-types');
      if (typesResponse.ok) {
        const typesData = await typesResponse.json();
        if (typesData.success) {
          setVariableTypes(typesData.data);
        }
      }

      // Load law rates
      const ratesResponse = await fetch('/api/law-rates');
      if (ratesResponse.ok) {
        const ratesData = await ratesResponse.json();
        if (ratesData.success) {
          setLawRates(ratesData.data);
        }
      }

      // Load exchange rates
      const exchangeResponse = await fetch('/api/exchange-rates');
      if (exchangeResponse.ok) {
        const exchangeData = await exchangeResponse.json();
        if (exchangeData.success) {
          setExchangeRates(exchangeData.data);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load data',
      });
    }
    setIsLoading(false);
  };

  const handleCreateLawRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateForm.variableTypeId || !rateForm.rateName || !rateForm.rateValue) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill required fields',
      });
      return;
    }

    try {
      const payload = {
        variableTypeId: rateForm.variableTypeId,
        rateName: rateForm.rateName,
        fuelType: rateForm.fuelType || null,
        volumeMin: rateForm.volumeMin ? parseInt(rateForm.volumeMin) : null,
        volumeMax: rateForm.volumeMax ? parseInt(rateForm.volumeMax) : null,
        ageMin: rateForm.ageMin ? parseInt(rateForm.ageMin) : null,
        ageMax: rateForm.ageMax ? parseInt(rateForm.ageMax) : null,
        rateValue: parseFloat(rateForm.rateValue),
        rateUnit: rateForm.rateUnit,
        legalReference: rateForm.legalReference || null,
        description: rateForm.description || null,
        effectiveFrom: new Date(rateForm.effectiveFrom).toISOString(),
      };

      const response = await fetch(
        editingId ? `/api/law-rates/${editingId}` : '/api/law-rates',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: editingId ? 'Rate Updated' : 'Rate Created',
          description: 'Legislative rate has been saved successfully',
        });
        setEditingId(null);
        setRateForm({
          variableTypeId: '',
          rateName: '',
          fuelType: '',
          volumeMin: '',
          volumeMax: '',
          ageMin: '',
          ageMax: '',
          rateValue: '',
          rateUnit: 'percent',
          legalReference: '',
          description: '',
          effectiveFrom: new Date().toISOString().slice(0, 10),
        });
        loadData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error?.message || 'Failed to save rate',
        });
      }
    } catch (error) {
      console.error('Error saving rate:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save rate',
      });
    }
  };

  const handleCreateExchangeRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exchangeForm.variableTypeId || !exchangeForm.rateName || !exchangeForm.rateValue) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill required fields',
      });
      return;
    }

    try {
      const payload = {
        variableTypeId: exchangeForm.variableTypeId,
        rateName: exchangeForm.rateName,
        rateValue: parseFloat(exchangeForm.rateValue),
        rateDate: exchangeForm.rateDate,
        source: exchangeForm.source || null,
      };

      const response = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Exchange Rate Added',
          description: 'Exchange rate has been saved successfully',
        });
        setExchangeForm({
          variableTypeId: '',
          rateName: '',
          rateValue: '',
          rateDate: new Date().toISOString().slice(0, 10),
          source: 'manual',
        });
        loadData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error?.message || 'Failed to save exchange rate',
        });
      }
    } catch (error) {
      console.error('Error saving exchange rate:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save exchange rate',
      });
    }
  };

  const handleDeactivateRate = async (id: string) => {
    if (!confirm('Deactivate this rate?')) return;

    try {
      const response = await fetch(`/api/law-rates/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Rate Deactivated',
          description: 'Rate has been deactivated successfully',
        });
        loadData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error?.message || 'Failed to deactivate rate',
        });
      }
    } catch (error) {
      console.error('Error deactivating rate:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to deactivate rate',
      });
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            Only administrators can manage legislative variables
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Legislative Variables</CardTitle>
          <CardDescription>
            Manage legislative rates (taxes, duties, exchange rates) - Admin Only
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="law-rates">Law Rates</TabsTrigger>
              <TabsTrigger value="exchange-rates">Exchange Rates</TabsTrigger>
              <TabsTrigger value="variable-types">Variable Types</TabsTrigger>
            </TabsList>

            {/* Law Rates Tab */}
            <TabsContent value="law-rates" className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="px-3 py-2">Variable</th>
                          <th className="px-3 py-2">Rate Name</th>
                          <th className="px-3 py-2">Conditions</th>
                          <th className="px-3 py-2">Value</th>
                          <th className="px-3 py-2">Effective</th>
                          <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {lawRates.map((rate) => (
                          <tr key={rate.id} className="hover:bg-muted/40">
                            <td className="px-3 py-2">
                              <div className="font-medium">{rate.variableName}</div>
                              <div className="text-xs text-muted-foreground">
                                {rate.variableCode}
                              </div>
                            </td>
                            <td className="px-3 py-2">{rate.rateName}</td>
                            <td className="px-3 py-2 text-xs">
                              {rate.fuelType && <div>Fuel: {rate.fuelType}</div>}
                              {rate.volumeMin !== undefined && (
                                <div>
                                  Volume: {rate.volumeMin}-{rate.volumeMax || '∞'} cm³
                                </div>
                              )}
                              {rate.ageMin !== undefined && (
                                <div>
                                  Age: {rate.ageMin}-{rate.ageMax || '∞'} years
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium">{rate.rateValue}</div>
                              <div className="text-xs text-muted-foreground">{rate.rateUnit}</div>
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <div>From: {new Date(rate.effectiveFrom).toLocaleDateString()}</div>
                              {rate.effectiveTo && (
                                <div className="text-red-600">
                                  To: {new Date(rate.effectiveTo).toLocaleDateString()}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeactivateRate(rate.id)}
                                disabled={!!rate.effectiveTo}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Deactivate
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {lawRates.length === 0 && (
                      <div className="py-6 text-center text-muted-foreground text-sm">
                        No law rates found
                      </div>
                    )}
                  </div>

                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>
                        {editingId ? 'Edit Law Rate' : 'Create Law Rate'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleCreateLawRate} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Variable Type *</Label>
                            <Select
                              value={rateForm.variableTypeId}
                              onValueChange={(value) =>
                                setRateForm({ ...rateForm, variableTypeId: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select variable type" />
                              </SelectTrigger>
                              <SelectContent>
                                {variableTypes
                                  .filter((vt) => vt.category !== 'currency')
                                  .map((vt) => (
                                    <SelectItem key={vt.id} value={vt.id}>
                                      {vt.name} ({vt.code})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Rate Name *</Label>
                            <Input
                              value={rateForm.rateName}
                              onChange={(e) =>
                                setRateForm({ ...rateForm, rateName: e.target.value })
                              }
                              placeholder="e.g. Excise for gasoline up to 3.0L"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Fuel Type</Label>
                            <Select
                              value={rateForm.fuelType}
                              onValueChange={(value) =>
                                setRateForm({ ...rateForm, fuelType: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Optional" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Not specified</SelectItem>
                                <SelectItem value="gasoline">Gasoline</SelectItem>
                                <SelectItem value="diesel">Diesel</SelectItem>
                                <SelectItem value="hybrid">Hybrid</SelectItem>
                                <SelectItem value="plugin_hybrid">Plugin Hybrid</SelectItem>
                                <SelectItem value="electric">Electric</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Rate Value *</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={rateForm.rateValue}
                              onChange={(e) =>
                                setRateForm({ ...rateForm, rateValue: e.target.value })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Rate Unit *</Label>
                            <Select
                              value={rateForm.rateUnit}
                              onValueChange={(value) =>
                                setRateForm({ ...rateForm, rateUnit: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percent">Percent (%)</SelectItem>
                                <SelectItem value="eur_per_cm3">EUR per cm³</SelectItem>
                                <SelectItem value="usd_flat">USD (flat)</SelectItem>
                                <SelectItem value="multiplier">Multiplier</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Effective From *</Label>
                            <Input
                              type="date"
                              value={rateForm.effectiveFrom}
                              onChange={(e) =>
                                setRateForm({ ...rateForm, effectiveFrom: e.target.value })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Volume Min (cm³)</Label>
                            <Input
                              type="number"
                              value={rateForm.volumeMin}
                              onChange={(e) =>
                                setRateForm({ ...rateForm, volumeMin: e.target.value })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Volume Max (cm³)</Label>
                            <Input
                              type="number"
                              value={rateForm.volumeMax}
                              onChange={(e) =>
                                setRateForm({ ...rateForm, volumeMax: e.target.value })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Age Min (years)</Label>
                            <Input
                              type="number"
                              value={rateForm.ageMin}
                              onChange={(e) =>
                                setRateForm({ ...rateForm, ageMin: e.target.value })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Age Max (years)</Label>
                            <Input
                              type="number"
                              value={rateForm.ageMax}
                              onChange={(e) =>
                                setRateForm({ ...rateForm, ageMax: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Legal Reference</Label>
                          <Input
                            value={rateForm.legalReference}
                            onChange={(e) =>
                              setRateForm({ ...rateForm, legalReference: e.target.value })
                            }
                            placeholder="e.g. Tax Code of Ukraine, Article 215"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={rateForm.description}
                            onChange={(e) =>
                              setRateForm({ ...rateForm, description: e.target.value })
                            }
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button type="submit">
                            <Plus className="mr-2 h-4 w-4" />
                            {editingId ? 'Update Rate' : 'Create Rate'}
                          </Button>
                          {editingId && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Exchange Rates Tab */}
            <TabsContent value="exchange-rates" className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="px-3 py-2">Currency</th>
                          <th className="px-3 py-2">Rate Name</th>
                          <th className="px-3 py-2">Value</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {exchangeRates.map((rate) => (
                          <tr key={rate.id} className="hover:bg-muted/40">
                            <td className="px-3 py-2">
                              <div className="font-medium">{rate.variableName}</div>
                              <div className="text-xs text-muted-foreground">
                                {rate.variableCode}
                              </div>
                            </td>
                            <td className="px-3 py-2">{rate.rateName}</td>
                            <td className="px-3 py-2 font-mono">{rate.rateValue}</td>
                            <td className="px-3 py-2">{rate.rateDate}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {rate.source || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {exchangeRates.length === 0 && (
                      <div className="py-6 text-center text-muted-foreground text-sm">
                        No exchange rates found
                      </div>
                    )}
                  </div>

                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Add Exchange Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleCreateExchangeRate} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Currency Variable *</Label>
                            <Select
                              value={exchangeForm.variableTypeId}
                              onValueChange={(value) =>
                                setExchangeForm({ ...exchangeForm, variableTypeId: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              <SelectContent>
                                {variableTypes
                                  .filter((vt) => vt.category === 'currency')
                                  .map((vt) => (
                                    <SelectItem key={vt.id} value={vt.id}>
                                      {vt.name} ({vt.code})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Rate Name *</Label>
                            <Input
                              value={exchangeForm.rateName}
                              onChange={(e) =>
                                setExchangeForm({ ...exchangeForm, rateName: e.target.value })
                              }
                              placeholder="e.g. EUR to USD"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Rate Value *</Label>
                            <Input
                              type="number"
                              step="0.000001"
                              value={exchangeForm.rateValue}
                              onChange={(e) =>
                                setExchangeForm({ ...exchangeForm, rateValue: e.target.value })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Rate Date *</Label>
                            <Input
                              type="date"
                              value={exchangeForm.rateDate}
                              onChange={(e) =>
                                setExchangeForm({ ...exchangeForm, rateDate: e.target.value })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Source</Label>
                            <Select
                              value={exchangeForm.source}
                              onValueChange={(value) =>
                                setExchangeForm({ ...exchangeForm, source: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">Manual</SelectItem>
                                <SelectItem value="NBU">NBU (National Bank of Ukraine)</SelectItem>
                                <SelectItem value="ECB">ECB (European Central Bank)</SelectItem>
                                <SelectItem value="api">API</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Button type="submit">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Exchange Rate
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Variable Types Tab */}
            <TabsContent value="variable-types" className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {variableTypes.map((vt) => (
                        <tr key={vt.id} className="hover:bg-muted/40">
                          <td className="px-3 py-2 font-mono">{vt.code}</td>
                          <td className="px-3 py-2 font-medium">{vt.name}</td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                              {vt.category}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{vt.unit}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {vt.description}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                vt.active
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {vt.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {variableTypes.length === 0 && (
                    <div className="py-6 text-center text-muted-foreground text-sm">
                      No variable types found
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

