import { useCallback, useState } from "react";

interface UseAccessTokenResult {
    redeemToken: (token: string) => Promise<{ success: boolean; error?: string }>;
    checkAccess: () => Promise<any>;
    loading: boolean;
    error: string | null;
  }
  
  /**
   * Hook for access token management (trials/demos)
   */
  export function useAccessToken(teamId: string, userId: string): UseAccessTokenResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
  
    const redeemToken = useCallback(async (token: string): Promise<{ success: boolean; error?: string }> => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/billing/access-token/redeem`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            teamId,
            userId,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to redeem token');
        }
        
        const data = await response.json();
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    }, [teamId, userId]);
  
    const checkAccess = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/billing/access-token/check/${teamId}`);
        if (!response.ok) {
          throw new Error('Failed to check access');
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
      redeemToken,
      checkAccess,
      loading,
      error,
    };
  }