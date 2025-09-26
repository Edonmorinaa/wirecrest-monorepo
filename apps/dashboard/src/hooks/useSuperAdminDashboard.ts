import useSWR from 'swr';
import fetcher from 'src/lib/fetcher';

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

interface BusinessCreationTaskWithDetails {
  id: string;
  teamId: string;
  platform: string;
  status: string;
  currentStep: string | null;
  googlePlaceId: string | null;
  facebookUrl: string | null;
  tripAdvisorUrl: string | null;
  totalSteps: number;
  completedSteps: number;
  progressPercent: number;
  startedAt: Date | null;
  completedAt: Date | null;
  lastActivityAt: Date;
  errorCount: number;
  lastError: string | null;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  team: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  };
  statusMessages: Array<{
    id: string;
    step: string;
    status: string;
    message: string;
    messageType: string;
    timestamp: Date;
  }>;
  stepLogs: Array<{
    id: string;
    step: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    success: boolean;
    errorMessage: string | null;
  }>;
}

interface DashboardStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  failedTasks: number;
  retryingTasks: number;

  // Platform breakdown
  googleTasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  facebookTasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  tripAdvisorTasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  };

  // Recent activity
  tasksCreatedToday: number;
  tasksCompletedToday: number;
  recentErrorCount: number;
  averageCompletionTime: number; // in minutes
}

interface SuperAdminDashboardResponse {
  tasks: BusinessCreationTaskWithDetails[];
  stats: DashboardStats;
  recentMessages: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function useSuperAdminDashboard(filters: DashboardFilters = {}) {
  // Build query string
  const queryParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString());
    }
  });

  const queryString = queryParams.toString();
  const url = `/api/superadmin/dashboard${queryString ? `?${queryString}` : ''}`;

  const { data, error, mutate, isLoading, isValidating } = useSWR<{
    data: SuperAdminDashboardResponse;
  }>(url, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  });

  return {
    data: data?.data,
    tasks: data?.data?.tasks || [],
    stats: data?.data?.stats || {
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
    recentMessages: data?.data?.recentMessages || [],
    pagination: data?.data?.pagination || {
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    isLoading,
    isValidating,
    error,
    refresh: mutate,
  };
}
