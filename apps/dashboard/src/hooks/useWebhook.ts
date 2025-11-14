import type { EndpointOut } from 'svix';

import { trpc } from 'src/lib/trpc/client';

/**
 * Hook for fetching single webhook using tRPC
 * Replaces SWR with React Query (via tRPC)
 * 
 * Note: Webhooks may be disabled in the current implementation
 */
const useWebhook = (slug: string, endpointId: string | null) => {
  const { data, error, isLoading, refetch } = trpc.teams.getWebhooks.useQuery(
    { slug },
    {
      enabled: !!slug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60000, // 1 minute
    }
  );

  // Filter to find specific webhook by ID
  const webhook = endpointId && data 
    ? (data as EndpointOut[]).find((w: EndpointOut) => w.id === endpointId)
    : null;

  const mutateWebhook = async () => {
    await refetch();
  };

  return {
    isLoading,
    isError: error,
    webhook,
    mutateWebhook,
    refetch, // Additional alias
  };
};

export default useWebhook;
