import { useCallback, useMemo, useState } from "react";
import { useSubscription } from "./use-subscription.js";

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