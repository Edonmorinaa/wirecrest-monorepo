/**
 * useSubscriptionStatus Hook
 * 
 * Fetches and monitors team subscription status including demo mode detection
 * Migrated to use tRPC instead of direct fetch
 */

'use client';

import { trpc } from 'src/lib/trpc/client';

export interface SubscriptionStatus {
  status: string;
  plan: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
}

/**
 * Hook for fetching subscription status using tRPC
 * Replaces manual fetch with React Query (via tRPC)
 */
export function useSubscriptionStatus(teamSlug: string) {
  // Use tRPC query instead of manual fetch
  const { data, error, isLoading, refetch } = trpc.billing.getSubscriptionInfo.useQuery(
    { slug: teamSlug },
    {
      enabled: !!teamSlug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60000, // 1 minute
    }
  );

  // Check if user is in demo mode
  const isDemo = 
    data?.plan?.toLowerCase().includes('demo') ||
    data?.plan?.toLowerCase().includes('trial') ||
    (data as any)?.metadata?.demo === 'true' ||
    data?.status === 'DEMO';

  return {
    subscription: data || null,
    loading: isLoading,
    error: error?.message || null,
    isDemo,
    hasActiveSubscription: data?.status === 'ACTIVE' || data?.status === 'TRIALING',
    isPastDue: data?.status === 'PAST_DUE',
    isCancelled: data?.status === 'CANCELLED',
    isPaused: data?.status === 'PAUSED',
    refetch,
  };
}
