'use client';

/**
 * React Hook for Feature Access
 * Frontend integration for Stripe-driven feature flags
 */

import { useState, useEffect, useCallback } from 'react';
import { FeatureAccessService, FeatureAccessResult } from '../feature-access';
import { FeatureFlag } from '../feature-flags';

export interface UseFeatureAccessReturn {
  features: string[];
  hasFeature: (feature: FeatureFlag) => boolean;
  hasFeatures: (features: FeatureFlag[]) => boolean;
  canAccessPlatform: (platform: string) => boolean;
  canAccessMultiLocation: () => boolean;
  canAccessAPI: () => boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  accessResult: FeatureAccessResult | null;
}

export function useFeatureAccess(teamId: string): UseFeatureAccessReturn {
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessResult, setAccessResult] = useState<FeatureAccessResult | null>(null);

  const service = new FeatureAccessService();

  const loadFeatures = useCallback(async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await service.getFeatureAccess(teamId);
      setAccessResult(result);
      setFeatures(result.features);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load features';
      setError(errorMessage);
      setFeatures([]);
      setAccessResult(null);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const hasFeature = useCallback((feature: FeatureFlag): boolean => {
    return features.includes(feature);
  }, [features]);

  const hasFeatures = useCallback((requiredFeatures: FeatureFlag[]): boolean => {
    return requiredFeatures.every(feature => features.includes(feature));
  }, [features]);

  const canAccessPlatform = useCallback((platform: string): boolean => {
    // For now, return synchronous check based on current features
    // In a real implementation, you might want to cache platform access
    return features.includes(platform as any);
  }, [features]);

  const canAccessMultiLocation = useCallback((): boolean => {
    return features.includes('multi_location');
  }, [features]);

  const canAccessAPI = useCallback((): boolean => {
    return features.includes('api_access');
  }, [features]);

  return {
    features,
    hasFeature,
    hasFeatures,
    canAccessPlatform,
    canAccessMultiLocation,
    canAccessAPI,
    loading,
    error,
    refresh: loadFeatures,
    accessResult,
  };
}

/**
 * Hook for checking a single feature
 */
export function useFeature(teamId: string, feature: FeatureFlag) {
  const { hasFeature, loading, error } = useFeatureAccess(teamId);
  
  return {
    enabled: hasFeature(feature),
    loading,
    error,
  };
}

/**
 * Hook for checking multiple features
 */
export function useFeatures(teamId: string, features: FeatureFlag[]) {
  const { hasFeatures, loading, error } = useFeatureAccess(teamId);
  
  return {
    enabled: hasFeatures(features),
    loading,
    error,
  };
}
