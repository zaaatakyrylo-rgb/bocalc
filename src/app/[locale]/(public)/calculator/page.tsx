'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCalculator } from '@/hooks/useCalculator';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/utils';
import { US_STATES, BODY_TYPES } from '@/lib/constants';

export default function CalculatorPage() {
  const t = useTranslations();
  const { calculate, result, isCalculating, error } = useCalculator();
  const { toast } = useToast();

  // Form state
  const [carPrice, setCarPrice] = useState('');
  const [auctionId, setAuctionId] = useState('copart');
  const [stateOrigin, setStateOrigin] = useState('');
  const [portDestination, setPortDestination] = useState('');
  const [bodyType, setBodyType] = useState('sedan');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [isRunning, setIsRunning] = useState(true);
  const [vendorId, setVendorId] = useState('default-vendor');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!carPrice || !stateOrigin || !portDestination) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    const input = {
      carPrice: parseFloat(carPrice),
      auctionId,
      stateOrigin,
      portDestination,
      bodyType: bodyType as any,
      year: parseInt(year),
      isRunning,
      vendorId,
    };

    await calculate(input);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Calculation Failed',
        description: error,
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            {t('calculator.title')}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {t('calculator.subtitle')}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>{t('calculator.step1')}</CardTitle>
              <CardDescription>
                Enter vehicle and shipping details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="carPrice">{t('calculator.carPrice')} *</Label>
                  <Input
                    id="carPrice"
                    type="number"
                    placeholder="10000"
                    value={carPrice}
                    onChange={(e) => setCarPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auction">{t('calculator.auction')}</Label>
                  <Select value={auctionId} onValueChange={setAuctionId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="copart">Copart</SelectItem>
                      <SelectItem value="iaai">IAAI</SelectItem>
                      <SelectItem value="manheim">Manheim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stateOrigin">{t('calculator.stateOrigin')} *</Label>
                  <Select value={stateOrigin} onValueChange={setStateOrigin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portDestination">{t('calculator.portDestination')} *</Label>
                  <Select value={portDestination} onValueChange={setPortDestination}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select port" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="port-odessa">Port of Odessa (Ukraine)</SelectItem>
                      <SelectItem value="port-riga">Port of Riga (Latvia)</SelectItem>
                      <SelectItem value="port-poti">Port of Poti (Georgia)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bodyType">{t('calculator.bodyType')}</Label>
                  <Select value={bodyType} onValueChange={setBodyType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BODY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`bodyTypes.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">{t('calculator.year')}</Label>
                  <Input
                    id="year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isRunning"
                    checked={isRunning}
                    onChange={(e) => setIsRunning(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isRunning" className="font-normal">
                    {t('calculator.running')}
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isCalculating}
                >
                  {isCalculating ? t('common.loading') : t('calculator.calculate')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>{t('calculator.breakdown')}</CardTitle>
              <CardDescription>
                Detailed cost breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('calculator.auctionFee')}</span>
                      <span className="font-medium">
                        {formatCurrency(result.breakdown.auctionFee.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t('calculator.usaShipping')}</span>
                      <span className="font-medium">
                        {formatCurrency(result.breakdown.usaShipping.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t('calculator.oceanShipping')}</span>
                      <span className="font-medium">
                        {formatCurrency(result.breakdown.oceanShipping.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t('calculator.customsClearance')}</span>
                      <span className="font-medium">
                        {formatCurrency(result.breakdown.customsClearance.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t('calculator.vendorFees')}</span>
                      <span className="font-medium">
                        {formatCurrency(result.breakdown.vendorFees.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>{t('calculator.total')}</span>
                      <span className="text-primary">
                        {formatCurrency(result.total)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {t('calculator.validUntil')}: {new Date(result.validUntil).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      {t('calculator.saveCalculation')}
                    </Button>
                    <Button variant="outline" className="flex-1">
                      {t('calculator.exportPDF')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Enter vehicle details and click Calculate to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

