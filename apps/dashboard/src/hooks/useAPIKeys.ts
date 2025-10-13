import type { ApiResponse } from 'src/types';

import useSWR, { mutate } from 'swr';
import { ApiKey } from '@prisma/client';

import fetcher from 'src/lib/fetcher';

const useAPIKeys = (slug: string | undefined) => {
  const url = `/api/teams/${slug}/api-keys`;

  const { data, error, isLoading } = useSWR<ApiResponse<ApiKey[]>>(() => slug ? url : null, fetcher);

  const mutateAPIKeys = async () => {
    mutate(url);
  };

  return {
    data,
    isLoading,
    error,
    mutate: mutateAPIKeys,
  };
};

export default useAPIKeys;
