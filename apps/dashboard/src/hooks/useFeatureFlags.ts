'use client';

import { StripeFeatureLookupKey } from '@wirecrest/billing';
import { useState, useEffect, useCallback } from 'react';
import { getTenantFeatures } from '@/actions';

interface FeatureFlagsData {
  features: Record<string, boolean>;
  metadata?: Record<string, any>;
  resolvedAt?: string;
}

interface UseFeatureFlagsReturn {
  features: Record<string, boolean>;
  isEnabled: (key: StripeFeatureLookupKey) => boolean;
  isDisabled: (key: StripeFeatureLookupKey) => boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateFeature: (key: StripeFeatureLookupKey, enabled: boolean) => Promise<void>;
  updateFeatures: (features: Record<string, boolean>) => Promise<void>;
  metadata?: Record<string, any>;
  resolvedAt?: string;
}

export function useFeatureFlags(tenantId: string): UseFeatureFlagsReturn {
  const [data, setData] = useState<FeatureFlagsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    setError(null);

    try {
      // Use server action instead of fetch
      const result = await getTenantFeatures(tenantId);

      if (result.success) {
        setData({
          features: result.features || {},
          metadata: result.metadata,
          resolvedAt: result.resolvedAt
        });
      } else {
        throw new Error(result.error || 'Failed to fetch features');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching features:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const updateFeature = useCallback(async (key: StripeFeatureLookupKey, enabled: boolean) => {
    throw new Error('Feature updates must be done through Stripe subscription management');
  }, [tenantId]);

  const updateFeatures = useCallback(async (features: Record<StripeFeatureLookupKey, boolean>) => {
    throw new Error('Feature updates must be done through Stripe subscription management');
  }, [tenantId]);

  const isEnabled = useCallback((key: StripeFeatureLookupKey): boolean => data?.features?.[key] ?? false, [data?.features]);

  const isDisabled = useCallback((key: StripeFeatureLookupKey): boolean => !isEnabled(key), [isEnabled]);

  const refresh = useCallback(async () => {
    await fetchFeatures();
  }, [fetchFeatures]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  return {
    features: data?.features ?? {},
    isEnabled,
    isDisabled,
    loading,
    error,
    refresh,
    updateFeature,
    updateFeatures,
    metadata: data?.metadata,
    resolvedAt: data?.resolvedAt
  };
}

export default useFeatureFlags;
