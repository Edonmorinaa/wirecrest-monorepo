/**
 * Feature Sync Hook
 * 
 * Automatically syncs features when user logs in or subscription changes.
 * This hook should be used in the main layout or authentication components.
 */

'use client';

import { useEffect, useCallback } from 'react';
import { syncTeamFeatures } from '@/services/feature-sync';

interface UseFeatureSyncProps {
  teamId: string;
  enabled?: boolean;
}

export function useFeatureSync({ teamId, enabled = true }: UseFeatureSyncProps) {
  const syncFeatures = useCallback(async () => {
    if (!enabled || !teamId) return;

    try {
      console.log('Syncing features for team:', teamId);
      const result = await syncTeamFeatures(teamId);
      
      if (result.success) {
        console.log('Features synced successfully:', result.features);
      } else {
        console.error('Failed to sync features:', result.error);
      }
    } catch (error) {
      console.error('Error in feature sync:', error);
    }
  }, [teamId, enabled]);

  useEffect(() => {
    // Sync features when component mounts
    syncFeatures();
  }, [syncFeatures]);

  return {
    syncFeatures,
  };
}

export default useFeatureSync;
