import { trpc } from 'src/lib/trpc/client';

/**
 * Hook for super admin tenant detail using tRPC
 * Replaces SWR with server actions to React Query (via tRPC) - auto-refreshes every 10s
 */
export function useSuperAdminTenant(tenantId: string) {
  const { data, error, isLoading, refetch } = trpc.superadmin.getTeamPlatformData.useQuery(
    { teamId: tenantId },
    {
      enabled: !!tenantId,
      refetchInterval: 10000, // Poll every 10 seconds for real-time updates
      refetchOnWindowFocus: true,
      staleTime: 5000,
      onError: (err) => {
        console.error('Error fetching tenant data:', err);
      },
    }
  );

  // Extract data with proper structure
  const tenant = data?.team || null;
  const platforms = data?.platforms || null;
  const recentActivity = data?.recentActivity || [];
  const stats = data?.stats || {
    totalReviews: 0,
    totalPhotos: 0,
    averageRating: 0,
    completionPercentage: 0,
    activeTasksCount: 0,
    failedTasksCount: 0,
  };

  return {
    data,
    tenant,
    platforms,
    recentActivity,
    stats,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch tenant') : null,
    refresh: refetch,
  };
}
