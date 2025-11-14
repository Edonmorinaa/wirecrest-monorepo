import { trpc } from 'src/lib/trpc/client';

interface TenantFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  platform?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Hook for super admin tenants list using tRPC
 * Replaces SWR with React Query (via tRPC) - auto-refreshes every minute
 */
export function useSuperAdminTenants(filters: TenantFilters = {}) {
  const { data, error, isLoading, isRefetching, refetch } = trpc.tenants.list.useQuery(
    filters,
    {
      refetchInterval: 60000, // Refresh every minute
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 10000,
    }
  );

  return {
    data,
    tenants: data?.tenants || [],
    stats: data?.stats || {
      totalTenants: 0,
      completedTenants: 0,
      inProgressTenants: 0,
      notStartedTenants: 0,
      failedTenants: 0,
      googleIntegrations: 0,
      facebookIntegrations: 0,
      tripadvisorIntegrations: 0,
      bookingIntegrations: 0,
    },
    pagination: data?.pagination || {
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    isLoading,
    isValidating: isRefetching,
    error,
    refresh: refetch,
  };
}
