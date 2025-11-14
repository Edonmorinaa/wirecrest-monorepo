import { useAuth } from '@wirecrest/auth-next';
import { useParams } from 'next/navigation';
import { Team, BusinessMarketIdentifier } from '@prisma/client';

import { trpc } from 'src/lib/trpc/client';
import { CACHE_TIMES } from 'src/lib/trpc/cache';

import { useTeamSlug } from './use-subdomain';

export type TeamWithMarketIdentifiers = Team & {
  marketIdentifiers: BusinessMarketIdentifier[];
};

/**
 * Hook for fetching team data using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useTeam = (slug?: string) => {
  const params = useParams();
  const { user } = useAuth();
  const subdomainTeamSlug = useTeamSlug();

  // Get slug from props, subdomain, params, or fallback to user's current team
  const teamSlug = slug || subdomainTeamSlug || (params?.slug as string) || user?.team?.slug || null;
  const currentUser = user;

  // Use tRPC query instead of SWR
  // Enable Suspense mode to trigger loading.tsx during data fetching
  // NOTE: When using suspense, enabled must be true or Suspense won't trigger
  const { data, error, isLoading, refetch } = trpc.teams.get.useQuery(
    { slug: teamSlug! },
    {
      // enabled: true, // Must be enabled for Suspense to work
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: CACHE_TIMES.TEAM.staleTime,
      gcTime: CACHE_TIMES.TEAM.gcTime,
      suspense: true, // ← Enable Suspense mode
    }
  );

  // Provide fallback data from user's current team if no data yet
  const team = data || (currentUser && currentUser.team
    ? {
        id: currentUser.team.id,
        slug: currentUser.team.slug,
        name: currentUser.team.name,
        domain: currentUser.team.domain,
        defaultRole: currentUser.role,
        billingId: null,
        billingProvider: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        marketIdentifiers: [],
      } as TeamWithMarketIdentifiers
    : null);

  return {
    isLoading,
    isError: error,
    team,
    teamSlug,
    currentUser,
    mutate: refetch, // Alias for backwards compatibility
  };
};

export default useTeam;
