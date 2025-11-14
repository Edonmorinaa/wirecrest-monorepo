/**
 * Hook to monitor scraper sync status for a team
 * Used to show loading states during initial data scraping
 * Migrated to use tRPC instead of direct ScraperApiClient
 */

import { trpc } from 'src/lib/trpc/client';

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
      refetchInterval: (data) => {
        // If onlyPollWhenActive is true, only poll when there are active syncs
        if (onlyPollWhenActive && data) {
          const hasActiveSyncs = data.recentSyncs.some(
            (sync) => sync.status === 'running' || sync.status === 'pending'
          );
          return hasActiveSyncs ? refreshInterval : 0;
        }
        return refreshInterval;
      },
      refetchOnWindowFocus: false,
      staleTime: 5000,
    }
  );

  // Check if there are active syncs
  const hasActiveSyncs = data?.recentSyncs.some(
    (sync) => sync.status === 'running' || sync.status === 'pending'
  ) || false;

  // Check if syncing is complete
  const isSyncing = hasActiveSyncs;
  const isComplete = !hasActiveSyncs && (data?.recentSyncs.length ?? 0) > 0;

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
  };
}
