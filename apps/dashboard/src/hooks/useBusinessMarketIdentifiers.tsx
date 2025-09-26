import fetcher from 'src/lib/fetcher';
import { BusinessMarketIdentifier } from '@prisma/client';
import useSWR, { mutate } from 'swr';
import type { ApiResponse } from 'src/types';

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
