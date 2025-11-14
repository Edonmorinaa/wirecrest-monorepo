/**
 * Feature Sync Hook
 * 
 * Automatically syncs features when user logs in or subscription changes.
 * This hook should be used in the main layout or authentication components.
 * 
 * NOTE: Migrated to use tRPC mutation instead of direct service call
 */

'use client';

import { useEffect, useCallback } from 'react';

import { trpc } from 'src/lib/trpc/client';

interface UseFeatureSyncProps {
  teamId: string;
  enabled?: boolean;
}

/**
 * Hook for syncing team features using tRPC
 * Replaces direct service call with tRPC mutation
 */
export function useFeatureSync({ teamId, enabled = true }: UseFeatureSyncProps) {
  const syncMutation = trpc.utils.syncTeamFeatures.useMutation({
    onSuccess: (result) => {
      console.log('Features synced successfully:', result.features);
    },
    onError: (error) => {
      console.error('Failed to sync features:', error.message);
    },
  });

  const syncFeatures = useCallback(async () => {
    if (!enabled || !teamId) return;

    try {
      console.log('Syncing features for team:', teamId);
      await syncMutation.mutateAsync({ teamId });
    } catch (error) {
      console.error('Error in feature sync:', error);
    }
  }, [teamId, enabled, syncMutation]);

  useEffect(() => {
    // Sync features when component mounts
    syncFeatures();
  }, [syncFeatures]);

  return {
    syncFeatures,
    isSyncing: syncMutation.isLoading,
  };
}

export default useFeatureSync;
