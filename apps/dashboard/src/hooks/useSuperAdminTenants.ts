// import { useEffect } from 'react';
import useSWR from 'swr';
import fetcher from 'src/lib/fetcher';
// import { supabase, REALTIME_CHANNELS, REALTIME_EVENTS } from 'src/lib/supabase';
import { getTenants } from '@/actions/tenants';

interface TenantFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  platform?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface TenantWithStatus {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  membersCount: number;

  // Platform statuses
  platforms: {
    google: {
      hasIdentifier: boolean;
      hasProfile: boolean;
      hasReviews: boolean;
      reviewsCount: number;
      status: 'not_started' | 'in_progress' | 'completed' | 'failed';
      lastActivity: Date | null;
    };
    facebook: {
      hasIdentifier: boolean;
      hasProfile: boolean;
      hasReviews: boolean;
      reviewsCount: number;
      status: 'not_started' | 'in_progress' | 'completed' | 'failed';
      lastActivity: Date | null;
    };
    tripadvisor: {
      hasIdentifier: boolean;
      hasProfile: boolean;
      hasReviews: boolean;
      reviewsCount: number;
      status: 'not_started' | 'in_progress' | 'completed' | 'failed';
      lastActivity: Date | null;
    };
    booking: {
      hasIdentifier: boolean;
      hasProfile: boolean;
      hasReviews: boolean;
      reviewsCount: number;
      status: 'not_started' | 'in_progress' | 'completed' | 'failed';
      lastActivity: Date | null;
    };
  };

  // Overall completion
  overallProgress: number;
  activeTasksCount: number;
  failedTasksCount: number;
  lastActivity: Date;
}

interface TenantsResponse {
  tenants: TenantWithStatus[];
  stats: {
    totalTenants: number;
    completedTenants: number;
    inProgressTenants: number;
    notStartedTenants: number;
    failedTenants: number;

    // Platform stats
    googleIntegrations: number;
    facebookIntegrations: number;
    tripadvisorIntegrations: number;
    bookingIntegrations: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function useSuperAdminTenants(filters: TenantFilters = {}) {
  // Build query string for cache key
  const queryParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString());
    }
  });

  const queryString = queryParams.toString();
  const cacheKey = `tenants${queryString ? `?${queryString}` : ''}`;

  const {
    data,
    error,
    mutate,
    isLoading,
    isValidating
  } = useSWR<TenantsResponse>(cacheKey, () => getTenants(filters), {
    refreshInterval: 60000, // Refresh every minute
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 10000,
  });

  // Set up real-time subscriptions - temporarily disabled for debugging
  // useEffect(() => {
  //   // Check if Supabase is properly configured
  //   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  //   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  //   if (!supabaseUrl || !supabaseAnonKey) {
  //     console.log('📡 Supabase not configured, skipping real-time subscriptions');
  //     return;
  //   }

  //   try {
  //     const channel = supabase.channel(REALTIME_CHANNELS.TENANTS);

  //     // Subscribe to tenant updates
  //     channel.on('broadcast', { event: REALTIME_EVENTS.TENANT_UPDATED }, (payload) => {
  //       console.log('🔄 Real-time tenant update received:', payload);
  //       mutate(); // Refresh data when updates are received
  //     });

  //     // Subscribe to platform status changes
  //     channel.on('broadcast', { event: REALTIME_EVENTS.PLATFORM_STATUS_CHANGED }, (payload) => {
  //       console.log('🔄 Real-time platform status change:', payload);
  //       mutate(); // Refresh data when platform status changes
  //     });

  //     // Subscribe to stats updates
  //     channel.on('broadcast', { event: REALTIME_EVENTS.STATS_UPDATED }, (payload) => {
  //       console.log('🔄 Real-time stats update:', payload);
  //       mutate(); // Refresh data when stats change
  //     });

  //     // Subscribe to the channel
  //     channel.subscribe((status) => {
  //       console.log('📡 Tenants real-time subscription status:', status);
  //     });

  //     // Cleanup subscription on unmount
  //     return () => {
  //       console.log('🔌 Unsubscribing from tenants real-time channel');
  //       supabase.removeChannel(channel);
  //     };
  //   } catch (error) {
  //     console.warn('Failed to set up real-time subscriptions:', error);
  //   }
  // }, [mutate]);

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
    isValidating,
    error,
    refresh: mutate,
  };
}
