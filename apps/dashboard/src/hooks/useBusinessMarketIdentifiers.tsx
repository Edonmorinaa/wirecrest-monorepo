import type { ApiResponse } from 'src/types';

import useSWR, { mutate } from 'swr';
import { BusinessMarketIdentifier } from '@prisma/client';

import fetcher from 'src/lib/fetcher';

const useBusinessMarketIdentifiers = (params: { teamSlug: string }) => {
  const url = `/api/business-market-identifiers/${params.teamSlug}`;

  const { data, error, isLoading } = useSWR<ApiResponse<BusinessMarketIdentifier[]>>(url, fetcher);

  const mutateBusinessMarketIdentifiers = async () => {
    mutate(url);
  };

  return {
    isLoading,
    isError: error,
    businessMarketIdentifiers: data?.data,
    mutateBusinessMarketIdentifiers,
  };
};

export default useBusinessMarketIdentifiers;
