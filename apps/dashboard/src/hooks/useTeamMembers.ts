import type { User, TeamMember } from '@prisma/client';

import { trpc } from 'src/lib/trpc/client';

export type TeamMemberWithUser = TeamMember & { user: User };

/**
 * Hook for fetching team members using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useTeamMembers = (slug: string) => {
  const { data, error, isLoading, refetch } = trpc.teams.getMembers.useQuery(
    { slug },
    {
      enabled: !!slug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60000, // 1 minute
    }
  );

  const mutateTeamMembers = async () => {
    await refetch();
  };

  return {
    isLoading,
    isError: error,
    members: data as TeamMemberWithUser[] | undefined,
    mutateTeamMembers,
    refetch, // Additional alias
  };
};

export default useTeamMembers;
