import { BusinessMarketIdentifier } from '@prisma/client';

import { trpc } from 'src/lib/trpc/client';

/**
 * Hook for fetching business market identifiers using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useBusinessMarketIdentifiers = (params: { teamSlug: string }) => {
  const { data, error, isLoading, refetch } = trpc.teams.get.useQuery(
    { slug: params.teamSlug },
    {
      enabled: !!params.teamSlug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60000, // 1 minute
    }
  );

  const mutateBusinessMarketIdentifiers = async () => {
    await refetch();
  };

  return {
    isLoading,
    isError: error,
    businessMarketIdentifiers: data?.marketIdentifiers as BusinessMarketIdentifier[] | undefined,
    mutateBusinessMarketIdentifiers,
    refetch, // Additional alias
  };
};

export default useBusinessMarketIdentifiers;
