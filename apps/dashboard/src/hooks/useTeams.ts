import type { TeamWithMemberCount } from 'src/types';

import { trpc } from 'src/lib/trpc/client';

/**
 * Hook for fetching all teams using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useTeams = () => {
  const { data, error, isLoading, refetch } = trpc.teams.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 60000, // 1 minute
  });

  const mutateTeams = async () => {
    await refetch();
  };

  return {
    isLoading,
    isError: error,
    teams: data as TeamWithMemberCount[] | undefined,
    mutateTeams,
    refetch, // Additional alias
  };
};

export default useTeams;
