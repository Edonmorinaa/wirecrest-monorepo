/**
 * Hook to monitor scraper sync status for a team
 * Used to show loading states during initial data scraping
 * Migrated to use tRPC instead of direct ScraperApiClient
 */

import { trpc } from 'src/lib/trpc/client';

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

/**
 * Hook for monitoring sync status using tRPC
 * Replaces SWR with ScraperApiClient to React Query (via tRPC)
 */
export function useSyncStatus(options: UseSyncStatusOptions = {}) {
  const {
    teamId,
    refreshInterval = 10000,
    onlyPollWhenActive = true,
  } = options;

  const { data, error, isLoading, refetch } = trpc.utils.getSyncStatus.useQuery(
    { teamId: teamId! },
    {
      enabled: !!teamId,
      refetchInterval: (queryResult: any) => {
        // If onlyPollWhenActive is true, only poll when there are active syncs
        if (onlyPollWhenActive && queryResult) {
          const hasActiveSyncs = queryResult.recentSyncs?.some(
            (sync: any) => sync.status === 'running' || sync.status === 'pending'
          ) ?? false;
          return hasActiveSyncs ? refreshInterval : 0;
        }
        return refreshInterval;
      },
      refetchOnWindowFocus: false,
      staleTime: 5000,
    }
  );

  // Check if there are active syncs
  const hasActiveSyncs = data?.recentSyncs?.some(
    (sync: any) => sync.status === 'running' || sync.status === 'pending'
  ) || false;

  // Check if syncing is complete
  const isSyncing = hasActiveSyncs;
  const isComplete = !hasActiveSyncs && (data?.recentSyncs?.length ?? 0) > 0;

  /**
   * Get sync status for a specific platform
   */
  const getPlatformSyncStatus = (platform: string) => {
    if (!data?.recentSyncs) return null;
    
    const platformSyncs = data.recentSyncs.filter(
      (sync: any) => sync.platform?.toLowerCase() === platform.toLowerCase()
    );
    
    if (platformSyncs.length === 0) return null;
    
    const latestSync = platformSyncs[0];
    return {
      status: latestSync.status,
      lastSync: latestSync.startedAt,
      reviewsNew: latestSync.reviewsNew || 0,
      reviewsDuplicate: latestSync.reviewsDuplicate || 0,
    };
  };

  return {
    data,
    recentSyncs: data?.recentSyncs || [],
    activeSchedules: data?.activeSchedules || 0,
    lastSync: data?.lastSync || null,
    hasActiveSyncs,
    isSyncing,
    isComplete,
    isLoading,
    error,
    refresh: refetch,
    getPlatformSyncStatus,
  };
}
