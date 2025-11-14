import { trpc } from 'src/lib/trpc/client';

interface DashboardFilters {
  page?: number;
  limit?: number;
  status?: string;
  platform?: string;
  teamId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Hook for super admin dashboard data using tRPC
 * Replaces SWR with React Query (via tRPC) - auto-refreshes every 30s
 */
export function useSuperAdminDashboard(filters: DashboardFilters = {}) {
  const { data, error, isLoading, isRefetching, refetch } = trpc.superadmin.dashboard.useQuery(
    filters,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 5000,
    }
  );

  return {
    data,
    tasks: data?.tasks || [],
    stats: data?.stats || {
      totalTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      retryingTasks: 0,
      googleTasks: { total: 0, pending: 0, inProgress: 0, completed: 0, failed: 0 },
      facebookTasks: { total: 0, pending: 0, inProgress: 0, completed: 0, failed: 0 },
      tripAdvisorTasks: { total: 0, pending: 0, inProgress: 0, completed: 0, failed: 0 },
      bookingTasks: { total: 0, pending: 0, inProgress: 0, completed: 0, failed: 0 },
      instagramTasks: { total: 0, pending: 0, inProgress: 0, completed: 0, failed: 0 },
      tasksCreatedToday: 0,
      tasksCompletedToday: 0,
      recentErrorCount: 0,
      averageCompletionTime: 0,
    },
    recentMessages: data?.recentMessages || [],
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
