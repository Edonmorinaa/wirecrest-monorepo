import type { EndpointOut } from 'svix';
import type { ApiResponse } from 'src/types';

import useSWR, { mutate } from 'swr';

import fetcher from 'src/lib/fetcher';

const useWebhook = (slug: string, endpointId: string | null) => {
  const url = `/api/teams/${slug}/webhooks/${endpointId}`;

  const { data, error, isLoading } = useSWR<ApiResponse<EndpointOut>>(slug ? url : null, fetcher);

  const mutateWebhook = async () => {
    mutate(url);
  };

  return {
    isLoading,
    isError: error,
    webhook: data?.data,
    mutateWebhook,
  };
};

export default useWebhook;
