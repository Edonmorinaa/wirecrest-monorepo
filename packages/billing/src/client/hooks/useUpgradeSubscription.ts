import { useCallback, useState } from "react";
import { SubscriptionTier } from "../../shared/types/index.js";

interface UseUpgradeSubscriptionResult {
    upgradeSubscription: (tier: SubscriptionTier, options?: { seats?: number; locations?: number }) => Promise<{ success: boolean; clientSecret?: string }>;
    loading: boolean;
    error: string | null;
  }
  
  /**
   * Hook to upgrade subscription
   */
  export function useUpgradeSubscription(teamId: string): UseUpgradeSubscriptionResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
  
    const upgradeSubscription = useCallback(async (
      tier: SubscriptionTier,
      options?: { seats?: number; locations?: number }
    ): Promise<{ success: boolean; clientSecret?: string }> => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/billing/subscription/upgrade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            teamId,
            tier,
            ...options,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to upgrade subscription');
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
      upgradeSubscription,
      loading,
      error,
    };
  }