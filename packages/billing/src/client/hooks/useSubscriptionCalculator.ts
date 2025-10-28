import { useCallback, useState } from "react";
import { SubscriptionTier, SubscriptionCalculation } from "../../shared/types/index.js";

interface UseSubscriptionCalculatorResult {
    calculate: (tier: SubscriptionTier, overrides?: { seats?: number; locations?: number }) => Promise<SubscriptionCalculation>;
    loading: boolean;
    error: string | null;
  }
  
  /**
   * Hook to calculate subscription pricing
   */
  export function useSubscriptionCalculator(teamId: string): UseSubscriptionCalculatorResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
  
    const calculate = useCallback(async (
      tier: SubscriptionTier,
      overrides?: { seats?: number; locations?: number }
    ): Promise<SubscriptionCalculation> => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/billing/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            teamId,
            tier,
            overrides,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to calculate subscription');
        }
        
        const data = await response.json();
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    }, [teamId]);
  
    return {
      calculate,
      loading,
      error,
    };
  }