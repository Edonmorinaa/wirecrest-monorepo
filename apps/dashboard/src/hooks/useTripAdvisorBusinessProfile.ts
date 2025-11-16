import type { ApiResponse } from 'src/types';

import { Prisma } from '@prisma/client';

import { trpc } from 'src/lib/trpc/client';
import { CACHE_TIMES } from 'src/lib/trpc/cache';

/**
 * Hook for TripAdvisor Business Profile data using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useTripAdvisorBusinessProfile = (slug?: string) => {
  const teamSlug = typeof slug === 'string' ? slug : null;

  const { data, error, isLoading, refetch } = trpc.platforms.tripadvisorProfile.useQuery(
    { slug: teamSlug! },
    {
      suspense: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: CACHE_TIMES.PLATFORM_PROFILE.staleTime,
      gcTime: CACHE_TIMES.PLATFORM_PROFILE.gcTime,
      retry: 0, // Don't retry on 404 errors
      retryDelay: 5000,
      onError: (error) => {
        // Silently handle 404 errors (profile not found) as this is expected
        if (!error.message.includes('404')) {
          console.error('TripAdvisor overview fetch error:', error);
        }
      },
    }
  );

  const refreshOverview = async () => {
    await refetch();
  };

  return {
    data,
    isLoading,
    error: error?.message || null,
    refreshOverview,
    mutate: refetch, // Alias for backwards compatibility
  };
};

export default useTripAdvisorBusinessProfile;
