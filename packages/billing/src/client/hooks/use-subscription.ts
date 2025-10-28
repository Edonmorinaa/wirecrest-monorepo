/**
 * React Hooks for Billing and Subscription Management
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  SubscriptionDetails,
} from '../../shared/types/index.js';

interface UseSubscriptionResult {
  subscription: SubscriptionDetails | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to get current subscription details
 */
export function useSubscription(teamId: string): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/billing/subscription/${teamId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }
      
      const data = await response.json();
      setSubscription(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId) {
      fetchSubscription();
    }
  }, [teamId, fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    refresh: fetchSubscription,
  };
}