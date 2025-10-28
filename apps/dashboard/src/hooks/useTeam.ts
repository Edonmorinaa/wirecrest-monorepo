import type { ApiResponse } from 'src/types';

import useSWR from 'swr';
import { useAuth } from '@wirecrest/auth-next';
import { useParams } from 'next/navigation';
import { Team, BusinessMarketIdentifier } from '@prisma/client';

import fetcher from 'src/lib/fetcher';

import { useTeamSlug } from './use-subdomain';

export type TeamWithMarketIdentifiers = Team & {
  marketIdentifiers: BusinessMarketIdentifier[];
};

const useTeam = (slug?: string) => {
  const params = useParams();
  const { user } = useAuth();
  const subdomainTeamSlug = useTeamSlug();

  // Get slug from props, subdomain, params, or fallback to user's current team
  const teamSlug = slug || subdomainTeamSlug || (params?.slug as string) || user?.team?.slug || null;
  const currentUser = user;

  const { data, error, isLoading } = useSWR<ApiResponse<TeamWithMarketIdentifiers>>(
    teamSlug ? `/api/teams/${teamSlug}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes
      fallbackData:
        currentUser && currentUser.team
          ? {
              data: {
                id: currentUser?.team.id,
                slug: currentUser?.team.slug,
                name: currentUser?.team.name,
                domain: currentUser?.team.domain,
                defaultRole: currentUser?.role,
                billingId: null,
                billingProvider: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                marketIdentifiers: [],
              } as TeamWithMarketIdentifiers,
              error: null as never,
            }
          : undefined,
    }
  );

  return {
    isLoading,
    isError: error,
    team: data?.data,
    teamSlug,
    currentUser,
  };
};

export default useTeam;
