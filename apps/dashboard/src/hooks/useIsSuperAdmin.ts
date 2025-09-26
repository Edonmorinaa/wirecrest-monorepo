import { useAuth } from '@wirecrest/auth';
import useSWR from 'swr';
import fetcher from 'src/lib/fetcher';
import type { ApiResponse } from 'src/types';

interface SuperAdminCheckResponse {
  isSuperAdmin: boolean;
}

export function useIsSuperAdmin() {
  const { user } = useAuth();

  const { data, error, isLoading } = useSWR<ApiResponse<SuperAdminCheckResponse>>(
    user?.email ? '/api/superadmin/check' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      errorRetryCount: 1,
    }
  );

  return {
    isSuperAdmin: data?.data?.isSuperAdmin || false,
    isLoading,
    error,
  };
}

export default useIsSuperAdmin;
