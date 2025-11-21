import { trpc } from 'src/lib/trpc/client';

/**
 * Hook for super admin tenant detail using tRPC
 * Replaces SWR with server actions to React Query (via tRPC) - auto-refreshes every 10s
 * 
 * UPDATED: Now supports location-based platform architecture
 * - Returns team-level data (social platforms, members)
 * - Returns locations with their platform data
 * - Use with locationId to get specific location details
 */
export function useSuperAdminTenant(tenantId: string, locationId?: string | null) {
  const { data, error, isLoading, refetch } = trpc.superadmin.getTeamPlatformData.useQuery(
    { teamId: tenantId },
    {
      enabled: !!tenantId,
      refetchInterval: 10000, // Poll every 10 seconds for real-time updates
      refetchOnWindowFocus: true,
      staleTime: 5000,
    }
  );

  // Log errors when they occur
  if (error) {
    console.error('Error fetching tenant data:', error);
  }

  // Extract data with new location-based structure
  const tenant = data?.team || null;
  const locations = data?.locations || [];
  const socialPlatforms = data?.socialPlatforms || {
    instagram: null,
    tiktok: null,
  };
  const recentActivity = data?.recentActivity || [];
  const stats = data?.stats || {
    totalReviews: 0,
    totalPhotos: 0,
    averageRating: 0,
    completionPercentage: 0,
    activeTasksCount: 0,
    failedTasksCount: 0,
    locationsCount: 0,
    completedLocations: 0,
  };

  // If locationId is provided, find and return that specific location
  const selectedLocation = locationId 
    ? locations.find((loc) => loc.id === locationId) || locations[0] || null
    : locations[0] || null;

  // For backward compatibility, create a "platforms" object from selected location
  const platforms = selectedLocation ? {
    google: selectedLocation.platforms.google ? {
      ...selectedLocation.platforms.google,
      status: selectedLocation.platforms.google ? 'completed' : 'not_started',
      identifier: null,
    } : null,
    facebook: selectedLocation.platforms.facebook ? {
      ...selectedLocation.platforms.facebook,
      status: selectedLocation.platforms.facebook ? 'completed' : 'not_started',
      identifier: null,
    } : null,
    tripadvisor: selectedLocation.platforms.tripadvisor ? {
      ...selectedLocation.platforms.tripadvisor,
      status: selectedLocation.platforms.tripadvisor ? 'completed' : 'not_started',
      identifier: null,
    } : null,
    booking: selectedLocation.platforms.booking ? {
      ...selectedLocation.platforms.booking,
      status: selectedLocation.platforms.booking ? 'completed' : 'not_started',
      identifier: null,
    } : null,
    instagram: socialPlatforms.instagram,
    tiktok: socialPlatforms.tiktok,
  } : null;

  return {
    data,
    tenant,
    locations,
    selectedLocation,
    socialPlatforms,
    platforms, // Backward compatibility - contains selected location + social platforms
    recentActivity,
    stats,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch tenant') : null,
    refresh: refetch,
  };
}
