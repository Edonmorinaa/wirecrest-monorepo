import type { EndpointOut } from 'svix';
import type { ApiResponse } from 'src/types';

import useSWR, { mutate } from 'swr';

import fetcher from 'src/lib/fetcher';

const useWebhooks = (slug: string) => {
  const url = `/api/teams/${slug}/webhooks`;

  const { data, error, isLoading } = useSWR<ApiResponse<EndpointOut[]>>(slug ? url : null, fetcher);

  const mutateWebhooks = async () => {
    mutate(url);
  };

  return {
    isLoading,
    isError: error,
    webhooks: data?.data,
    mutateWebhooks,
  };
};

export default useWebhooks;
