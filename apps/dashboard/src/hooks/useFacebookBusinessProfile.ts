import type {
  FacebookOverview,
  FacebookBusinessProfile,
  FacebookBusinessMetadata,
} from '@prisma/client';
import type { ApiResponse } from 'src/types';

import { useParams } from 'next/navigation';

import { trpc } from 'src/lib/trpc/client';
import { CACHE_TIMES } from 'src/lib/trpc/cache';

import { useTeamSlug } from './use-subdomain';

export interface FacebookBusinessProfileWithRelations extends FacebookBusinessProfile {
  overview?: FacebookOverview | null;
  businessMetadata?: FacebookBusinessMetadata | null;
  reviews?: any[];
}

/**
 * Hook for Facebook Business Profile data using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useFacebookBusinessProfile = (slug?: string) => {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const rawTeamSlug = slug || subdomainTeamSlug || (params?.slug as string);
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  // Use tRPC query instead of SWR
  const { data, error, isLoading, refetch } = trpc.platforms.facebookProfile.useQuery(
    { slug: teamSlug! },
    {
      suspense: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: CACHE_TIMES.PLATFORM_PROFILE.staleTime,
      gcTime: CACHE_TIMES.PLATFORM_PROFILE.gcTime,
      retry: 3,
      retryDelay: 5000,
    }
  );

  const refreshProfile = async () => {
    await refetch();
  };

  return {
    businessProfile: data || null,
    isLoading,
    error: error || null,
    refreshProfile,
    mutate: refetch, // Alias for backwards compatibility
  };
};

export default useFacebookBusinessProfile;
