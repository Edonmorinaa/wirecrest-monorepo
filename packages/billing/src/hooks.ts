/**
 * React Hooks for Billing and Subscription Management
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { USAGE_LIMITS } from './types';
import type { 
  SubscriptionTier, 
  SubscriptionDetails,
  UsageRecord,
  QuotaCheck,
  SubscriptionCalculation,
} from './types';

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

interface UseBillingGateResult {
  hasAccess: boolean;
  reason?: 'quota_exceeded' | 'feature_disabled' | 'tier_insufficient' | 'trial_expired';
  showUpgradePrompt: () => void;
  upgradeRequired: boolean;
}

/**
 * Hook to gate features based on subscription and usage
 */
export function useBillingGate(
  teamId: string,
  feature: string,
  usage?: { type: string; category: string; quantity?: number }
): UseBillingGateResult {
  const { subscription } = useSubscription(teamId);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [reason, setReason] = useState<'quota_exceeded' | 'feature_disabled' | 'tier_insufficient' | 'trial_expired'>();

  const hasAccess = useMemo(() => {
    if (!subscription) return false;

    // Check if trial expired
    if (subscription.status === 'TRIALING' && subscription.trialEnd && new Date() > new Date(subscription.trialEnd)) {
      setReason('trial_expired');
      setUpgradeRequired(true);
      return false;
    }

    // Check if feature is enabled for current tier
    if (!subscription.enabledFeatures.includes(feature)) {
      setReason('feature_disabled');
      setUpgradeRequired(true);
      return false;
    }

    // TODO: Check usage quotas if usage is provided
    // This would require real-time quota checking

    setReason(undefined);
    setUpgradeRequired(false);
    return true;
  }, [subscription, feature]);

  const showUpgradePrompt = useCallback(() => {
    // Trigger upgrade modal
    // This could dispatch a global state action or emit an event
    console.log('Show upgrade prompt for feature:', feature);
  }, [feature]);

  return {
    hasAccess,
    reason,
    showUpgradePrompt,
    upgradeRequired,
  };
}

/**
 * Hook to get feature availability for current subscription
 */
export function useFeatureAccess(teamId: string) {
  const { subscription } = useSubscription(teamId);

  const hasFeature = useCallback((feature: string): boolean => {
    if (!subscription) return false;
    return subscription.enabledFeatures.includes(feature);
  }, [subscription]);

  const getRequiredTier = useCallback((feature: string): SubscriptionTier | null => {
    // This should be implemented by fetching tier configs from the database
    // For now, return null to avoid errors
    console.warn('getRequiredTier: This function needs to be implemented with database tier configs');
    return null;
  }, []);

  const canUpgrade = useCallback((fromTier: SubscriptionTier, toTier: SubscriptionTier): boolean => {
    const tiers: SubscriptionTier[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
    const fromIndex = tiers.indexOf(fromTier);
    const toIndex = tiers.indexOf(toTier);
    return toIndex > fromIndex;
  }, []);

  return {
    hasFeature,
    getRequiredTier,
    canUpgrade,
    currentTier: subscription?.tier || 'FREE',
    enabledFeatures: subscription?.enabledFeatures || [],
  };
}

// Re-export useMemo for convenience
import { useMemo } from 'react';
