import { ApiKey } from '@prisma/client';

import { trpc } from 'src/lib/trpc/client';

/**
 * Hook for fetching team API keys using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useAPIKeys = (slug: string | undefined) => {
  const { data, error, isLoading, refetch } = trpc.teams.getApiKeys.useQuery(
    { slug: slug! },
    {
      enabled: !!slug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60000, // 1 minute
    }
  );

  const mutateAPIKeys = async () => {
    await refetch();
  };

  return {
    data: data as ApiKey[] | undefined,
    isLoading,
    error,
    mutate: mutateAPIKeys,
    refetch, // Additional alias
  };
};

export default useAPIKeys;
