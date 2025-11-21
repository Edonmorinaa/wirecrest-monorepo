import { trpc } from 'src/lib/trpc/client';

/**
 * Hook for superadmin to fetch all locations for a team
 * Returns location list with platform counts
 */
export function useSuperAdminLocations(teamId: string) {
  const { data, error, isLoading, refetch } = trpc.superadmin.getTeamWithLocations.useQuery(
    { teamId },
    {
      enabled: !!teamId,
      refetchOnWindowFocus: true,
      staleTime: 10000,
    }
  );

  return {
    data,
    team: data?.team || null,
    locations: data?.locations || [],
    socialPlatforms: data?.socialPlatforms || null,
    stats: data?.stats || {
      locationsCount: 0,
      totalPlatformIntegrations: 0,
      totalSocialPlatforms: 0,
      totalReviews: 0,
    },
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch locations') : null,
    refresh: refetch,
  };
}

/**
 * Hook for superadmin to fetch platform data for a specific location
 */
export function useSuperAdminLocationPlatforms(teamId: string, locationId: string | null) {
  const { data, error, isLoading, refetch } = trpc.superadmin.getLocationPlatformData.useQuery(
    { teamId, locationId: locationId! },
    {
      enabled: !!teamId && !!locationId,
      refetchOnWindowFocus: true,
      staleTime: 5000,
    }
  );

  return {
    data,
    location: data?.location || null,
    platforms: data?.platforms || {
      google: null,
      facebook: null,
      tripadvisor: null,
      booking: null,
    },
    stats: data?.stats || {
      totalReviews: 0,
      completionPercentage: 0,
      completedPlatforms: 0,
      totalPlatforms: 4,
    },
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch location platforms') : null,
    refresh: refetch,
  };
}

/**
 * Hook for superadmin to create a team with first location
 */
export function useCreateTeamWithLocation() {
  const utils = trpc.useUtils();
  const mutation = trpc.superadmin.createTeamWithLocation.useMutation({
    onSuccess: () => {
      // Invalidate tenants list
      utils.tenants.list.invalidate();
      utils.superadmin.allTeams.invalidate();
    },
  });

  return {
    createTeamWithLocation: mutation.mutate,
    createTeamWithLocationAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error ? (mutation.error instanceof Error ? mutation.error.message : 'Failed to create team') : null,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}

