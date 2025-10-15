/**
 * Hook to monitor scraper sync status for a team
 * Used to show loading states during initial data scraping
 */

import useSWR from 'swr';
import { ScraperApiClient } from 'src/services/scraper-api';

interface SyncStatus {
  recentSyncs: Array<{
    id: string;
    platform: string;
    syncType: string;
    status: string;
    reviewsNew: number;
    reviewsDuplicate: number;
    startedAt: Date;
    completedAt: Date | null;
  }>;
  activeSchedules: number;
  lastSync: Date | null;
}

interface UseSyncStatusOptions {
  /**
   * Team ID to monitor
   */
  teamId?: string;
  
  /**
   * Polling interval in milliseconds
   * Set to 0 to disable polling
   * @default 10000 (10 seconds)
   */
  refreshInterval?: number;
  
  /**
   * Only poll when there are active syncs
   * @default true
   */
  onlyPollWhenActive?: boolean;
}

export function useSyncStatus(options: UseSyncStatusOptions = {}) {
  const {
    teamId,
    refreshInterval = 10000,
    onlyPollWhenActive = true,
  } = options;

  const { data, error, isLoading, mutate } = useSWR<SyncStatus>(
    teamId ? `sync-status-${teamId}` : null,
    () => ScraperApiClient.getSyncStatus(teamId!),
    {
      refreshInterval: (data) => {
        // If onlyPollWhenActive is true, only poll when there are active syncs
        if (onlyPollWhenActive && data) {
          const hasActiveSyncs = data.recentSyncs.some(
            (sync) => sync.status === 'running' || sync.status === 'pending'
          );
          return hasActiveSyncs ? refreshInterval : 0;
        }
        return refreshInterval;
      },
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  // Helper to check if initial sync is complete
  const isInitialSyncComplete = data?.lastSync !== null;

  // Helper to check if there are active syncs
  const hasActiveSyncs = data?.recentSyncs.some(
    (sync) => sync.status === 'running' || sync.status === 'pending'
  ) ?? false;

  // Helper to get sync status for a specific platform
  const getPlatformSyncStatus = (platform: string) => {
    if (!data) return null;
    
    const platformSyncs = data.recentSyncs.filter(
      (sync) => sync.platform.toLowerCase() === platform.toLowerCase()
    );
    
    if (platformSyncs.length === 0) return null;
    
    // Get the most recent sync
    const latestSync = platformSyncs.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0];
    
    return {
      status: latestSync.status,
      isActive: latestSync.status === 'running' || latestSync.status === 'pending',
      lastSync: latestSync.completedAt,
      reviewsNew: latestSync.reviewsNew,
      reviewsDuplicate: latestSync.reviewsDuplicate,
    };
  };

  return {
    syncStatus: data,
    isLoading,
    error,
    isInitialSyncComplete,
    hasActiveSyncs,
    getPlatformSyncStatus,
    refetch: mutate,
  };
}

