import { useCallback, useEffect, useState } from "react";


interface UseUsageAnalyticsResult {
    usage: any;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
  }
  
/**
 * Hook to get usage analytics
 */
export function useUsageAnalytics(teamId: string, days: number = 30): UseUsageAnalyticsResult {
    const [usage, setUsage] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  
    const fetchUsage = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/billing/usage/${teamId}?days=${days}`);
        if (!response.ok) {
          throw new Error('Failed to fetch usage analytics');
        }
        
        const data = await response.json();
        setUsage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }, [teamId, days]);
  
    useEffect(() => {
      if (teamId) {
        fetchUsage();
      }
    }, [teamId, fetchUsage]);
  
    return {
      usage,
      loading,
      error,
      refresh: fetchUsage,
    };
  }