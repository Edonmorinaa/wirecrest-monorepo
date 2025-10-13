/**
 * useSubscriptionStatus Hook
 * 
 * Fetches and monitors team subscription status including demo mode detection
 */

'use client';

import { useState, useEffect } from 'react';

export interface SubscriptionStatus {
  status: string;
  plan: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
}

export function useSubscriptionStatus(teamId: string) {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    async function fetchSubscription() {
      try {
        setLoading(true);
        setError(null);

        // Fetch subscription status from API
        const response = await fetch(`/api/teams/${teamId}/subscription`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch subscription status');
        }

        const data = await response.json();

        // Check if user is in demo mode
        // Demo mode is identified by specific plan name or metadata
        const isDemoMode = 
          data.plan?.toLowerCase().includes('demo') ||
          data.plan?.toLowerCase().includes('trial') ||
          data.metadata?.demo === 'true' ||
          data.status === 'DEMO';

        setSubscription(data);
        setIsDemo(isDemoMode);
      } catch (err: any) {
        console.error('Error fetching subscription:', err);
        setError(err.message);
        setSubscription(null);
        setIsDemo(false);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [teamId]);

  return {
    subscription,
    loading,
    error,
    isDemo,
    hasActiveSubscription: subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING',
    isPastDue: subscription?.status === 'PAST_DUE',
    isCancelled: subscription?.status === 'CANCELLED',
    isPaused: subscription?.status === 'PAUSED',
  };
}
