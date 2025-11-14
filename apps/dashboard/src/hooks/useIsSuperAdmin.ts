import { useAuth } from '@wirecrest/auth-next';

import { trpc } from 'src/lib/trpc/client';

interface SuperAdminCheckResponse {
  isSuperAdmin: boolean;
}

/**
 * Hook to check if user is super admin using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
export function useIsSuperAdmin() {
  const { user } = useAuth();

  const { data, error, isLoading } = trpc.admin.checkSuperAdminStatus.useQuery(
    undefined,
    {
      enabled: !!user?.email,
      refetchOnWindowFocus: false,
      errorRetryCount: 1,
      staleTime: 300000, // 5 minutes
    }
  );

  return {
    isSuperAdmin: data?.isSuperAdmin || false,
    isLoading,
    error,
  };
}

export default useIsSuperAdmin;
