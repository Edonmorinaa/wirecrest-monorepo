import { useCallback } from "react";
import { useSubscription } from "./use-subscription.js";
import { SubscriptionTier } from "../../shared/types/index.js";

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
  