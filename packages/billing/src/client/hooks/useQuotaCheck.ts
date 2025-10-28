import { useCallback, useState } from "react";
import { QuotaCheck } from "../../shared/types/index.js";

interface UseQuotaCheckResult {
    checkQuota: (type: string, category: string, quantity?: number) => Promise<QuotaCheck>;
    loading: boolean;
    error: string | null;
  }
  
  /**
   * Hook to check usage quotas
   */
  export function useQuotaCheck(teamId: string): UseQuotaCheckResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
  
    const checkQuota = useCallback(async (
      type: string,
      category: string,
      quantity: number = 1
    ): Promise<QuotaCheck> => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/billing/quota/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            teamId,
            type,
            category,
            quantity,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to check quota');
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
      checkQuota,
      loading,
      error,
    };
  }