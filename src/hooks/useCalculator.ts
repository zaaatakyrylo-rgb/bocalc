'use client';

import { useState } from 'react';
import { CalculatorInput, CalculationResult } from '@/types';
import { apiClient } from '@/lib/api-client';

interface UseCalculatorReturn {
  calculate: (input: CalculatorInput) => Promise<CalculationResult | null>;
  result: CalculationResult | null;
  isCalculating: boolean;
  error: string | null;
  clearResult: () => void;
  clearError: () => void;
}

/**
 * Hook for calculator functionality
 */
export function useCalculator(): UseCalculatorReturn {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = async (input: CalculatorInput): Promise<CalculationResult | null> => {
    setIsCalculating(true);
    setError(null);

    try {
      const response = await apiClient.calculator.calculate(input);

      if (response.success && response.data) {
        setResult(response.data);
        setIsCalculating(false);
        return response.data;
      } else {
        setError(response.error?.message || 'Calculation failed');
        setIsCalculating(false);
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Calculation failed');
      setIsCalculating(false);
      return null;
    }
  };

  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  return {
    calculate,
    result,
    isCalculating,
    error,
    clearResult,
    clearError,
  };
}


