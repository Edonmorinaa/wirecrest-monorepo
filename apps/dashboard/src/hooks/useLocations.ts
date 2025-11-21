/**
 * Locations Hooks
 * 
 * React hooks for location management and platform analytics.
 * All hooks use tRPC with React Query for optimal caching and real-time updates.
 */

import { trpc } from 'src/lib/trpc/client';

// ==========================================
// LOCATION CRUD HOOKS
// ==========================================

/**
 * Hook to get all locations for a team
 */
export function useLocations(teamSlug: string) {
  const { data, error, isLoading, refetch } = trpc.locations.getAll.useQuery(
    { teamSlug },
    {
      enabled: !!teamSlug,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    }
  );

  return {
    locations: data || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get a single location by ID
 */
export function useLocation(locationId: string) {
  const { data, error, isLoading, refetch } = trpc.locations.getById.useQuery(
    { locationId },
    {
      enabled: !!locationId,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  return {
    location: data || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get a location by team slug and location slug
 * This is useful for route-based lookups like /teams/[slug]/[locationSlug]
 */
export function useLocationBySlug(teamSlug: string, locationSlug: string) {
  const { locations, isLoading, error } = useLocations(teamSlug);
  
  // Find location by matching the slug field or fallback to ID
  const location = locations?.find(
    (loc) => (loc.slug || loc.id) === locationSlug
  );

  return {
    location: location || null,
    isLoading,
    error,
  };
}

/**
 * Hook to create a location
 */
export function useCreateLocation() {
  const utils = trpc.useUtils();
  
  const mutation = trpc.locations.create.useMutation({
    onSuccess: () => {
      // Invalidate locations list to refetch
      utils.locations.getAll.invalidate();
    },
  });

  return {
    createLocation: mutation.mutate,
    createLocationAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to update a location
 */
export function useUpdateLocation() {
  const utils = trpc.useUtils();
  
  const mutation = trpc.locations.update.useMutation({
    onSuccess: (data) => {
      // Invalidate specific location and list
      utils.locations.getById.invalidate({ locationId: data.id });
      utils.locations.getAll.invalidate();
    },
  });

  return {
    updateLocation: mutation.mutate,
    updateLocationAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to delete a location
 */
export function useDeleteLocation() {
  const utils = trpc.useUtils();
  
  const mutation = trpc.locations.delete.useMutation({
    onSuccess: () => {
      // Invalidate locations list
      utils.locations.getAll.invalidate();
    },
  });

  return {
    deleteLocation: mutation.mutate,
    deleteLocationAsync: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}

// ==========================================
// GOOGLE PLATFORM HOOKS
// ==========================================

/**
 * Hook to get Google Business Profile
 */
export function useGoogleProfile(locationId: string, enabled = true) {
  const { data, error, isLoading, refetch } = trpc.locations.google.getProfile.useQuery(
    { locationId, platform: 'google' as const },
    {
      enabled: enabled && !!locationId,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
    }
  );

  return {
    profile: data || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get Google Analytics
 */
export function useGoogleAnalytics(
  locationId: string,
  startDate: string,
  endDate: string,
  enabled = true
) {
  const { data, error, isLoading, refetch } = trpc.locations.google.getAnalytics.useQuery(
    { locationId, platform: 'google' as const, startDate, endDate },
    {
      enabled: enabled && !!locationId && !!startDate && !!endDate,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  return {
    analytics: data || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get Google Reviews
 */
export function useGoogleReviews(
  locationId: string,
  filters?: any,
  pagination?: { page?: number; limit?: number },
  enabled = true
) {
  const { data, error, isLoading, refetch } = trpc.locations.google.getReviews.useQuery(
    { locationId, platform: 'google' as const, filters, pagination },
    {
      enabled: enabled && !!locationId,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      placeholderData: (previousData) => previousData, // Preserve previous data during refetching to prevent showing 0
    }
  );

  return {
    reviews: data?.reviews || [],
    pagination: data?.pagination || { page: 1, limit: 10, totalCount: data?.allTimeStats?.totalReviews || 0, totalPages: data?.allTimeStats?.totalReviews / 10 ? Math.ceil(data?.allTimeStats?.totalReviews / 10) : 0 },
    aggregates: data?.aggregates || null,
    allTimeStats: data?.allTimeStats || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get Google Enhanced Graph Data
 */
export function useGoogleEnhancedGraph(
  locationId: string,
  startDate: string,
  endDate: string,
  enabled = true
) {
  const { data, error, isLoading, refetch } = trpc.locations.google.getEnhancedGraph.useQuery(
    { locationId, platform: 'google' as const, startDate, endDate },
    {
      enabled: enabled && !!locationId && !!startDate && !!endDate,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  return {
    data: data || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to update Google Review Metadata
 */
export function useUpdateGoogleReviewMetadata() {
  const utils = trpc.useUtils();
  
  return trpc.locations.google.updateReviewMetadata.useMutation({
    onSuccess: () => {
      // Invalidate reviews query to refetch updated data
      utils.locations.google.getReviews.invalidate();
    },
  });
}

// ==========================================
// FACEBOOK PLATFORM HOOKS
// ==========================================

/**
 * Hook to get Facebook Business Profile
 */
export function useFacebookProfile(locationId: string, enabled = true) {
  const { data, error, isLoading, refetch } = trpc.locations.facebook.getProfile.useQuery(
    { locationId, platform: 'facebook' as const },
    {
      enabled: enabled && !!locationId,
      refetchOnWindowFocus: false,
      staleTime: 60000,
    }
  );

  return {
    profile: data || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get Facebook Analytics
 */
export function useFacebookAnalytics(
  locationId: string,
  startDate: string,
  endDate: string,
  enabled = true
) {
  const { data, error, isLoading, refetch } = trpc.locations.facebook.getAnalytics.useQuery(
    { locationId, platform: 'facebook' as const, startDate, endDate },
    {
      enabled: enabled && !!locationId && !!startDate && !!endDate,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  return {
    analytics: data || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get Facebook Reviews
 */
export function useFacebookReviews(
  locationId: string,
  filters?: any,
  pagination?: { page?: number; limit?: number },
  enabled = true
) {
  const { data, error, isLoading, refetch } = trpc.locations.facebook.getReviews.useQuery(
    { locationId, platform: 'facebook' as const, filters, pagination },
    {
      enabled: enabled && !!locationId,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      placeholderData: (previousData) => previousData, // Preserve previous data during refetching to prevent showing 0
    }
  );

  return {
    reviews: data?.reviews || [],
    pagination: data?.pagination || { page: 1, limit: 10, totalCount: data?.allTimeStats?.totalReviews || 0, totalPages: data?.allTimeStats?.totalReviews / 10 ? Math.ceil(data?.allTimeStats?.totalReviews / 10) : 0 },
    aggregates: data?.aggregates || null,
    allTimeStats: data?.allTimeStats || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get Facebook Enhanced Graph Data
 */
export function useFacebookEnhancedGraph(
  locationId: string,
  startDate: string,
  endDate: string,
  enabled = true
) {
  const { data, error, isLoading, refetch } = trpc.locations.facebook.getEnhancedGraph.useQuery(
    { locationId, platform: 'facebook' as const, startDate, endDate },
    {
      enabled: enabled && !!locationId && !!startDate && !!endDate,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  return {
    daily: data?.daily || [],
    overview: data?.overview || null,
    trends: data?.trends || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to update Facebook Review Metadata
 */
export function useUpdateFacebookReviewMetadata() {
  const utils = trpc.useUtils();
  
  return trpc.locations.facebook.updateReviewMetadata.useMutation({
    onSuccess: () => {
      // Invalidate reviews query to refetch updated data
      utils.locations.facebook.getReviews.invalidate();
    },
  });
}

// ==========================================
// TRIPADVISOR PLATFORM HOOKS
// ==========================================

/**
 * Hook to get TripAdvisor Business Profile
 */
export function useTripAdvisorProfile(locationId: string, enabled = true) {
  const { data, error, isLoading, refetch } = trpc.locations.tripadvisor.getProfile.useQuery(
    { locationId, platform: 'tripadvisor' as const },
    {
      enabled: enabled && !!locationId,
      refetchOnWindowFocus: false,
      staleTime: 60000,
    }
  );

  return {
    profile: data || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get TripAdvisor Analytics
 */
export function useTripAdvisorAnalytics(
  locationId: string,
  startDate: string,
  endDate: string,
  enabled = true
) {
  const { data, error, isLoading, refetch } = trpc.locations.tripadvisor.getAnalytics.useQuery(
    { locationId, platform: 'tripadvisor' as const, startDate, endDate },
    {
      enabled: enabled && !!locationId && !!startDate && !!endDate,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  return {
    analytics: data || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get TripAdvisor Reviews
 */
export function useTripAdvisorReviews(
  locationId: string,
  filters?: any,
  pagination?: { page?: number; limit?: number },
  enabled = true
) {
  const { data, error, isLoading, refetch } = trpc.locations.tripadvisor.getReviews.useQuery(
    { locationId, platform: 'tripadvisor' as const, filters, pagination },
    {
      enabled: enabled && !!locationId,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      placeholderData: (previousData) => previousData, // Preserve previous data during refetching to prevent showing 0
    }
  );

  return {
    reviews: data?.reviews || [],
    pagination: data?.pagination || { page: 1, limit: 10, totalCount: data?.allTimeStats?.totalReviews || 0, totalPages: data?.allTimeStats?.totalReviews / 10 ? Math.ceil(data?.allTimeStats?.totalReviews / 10) : 0 },
    aggregates: data?.aggregates || null,
    allTimeStats: data?.allTimeStats || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get TripAdvisor Enhanced Graph Data
 */
export function useTripAdvisorEnhancedGraph(
  locationId: string,
  startDate: string,
  endDate: string,
  enabled = true
) {
  const { data, error, isLoading, refetch } = trpc.locations.tripadvisor.getEnhancedGraph.useQuery(
    { locationId, platform: 'tripadvisor' as const, startDate, endDate },
    {
      enabled: enabled && !!locationId && !!startDate && !!endDate,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  return {
    daily: data?.daily || [],
    overview: data?.overview || null,
    trends: data?.trends || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to update TripAdvisor Review Metadata
 */
export function useUpdateTripAdvisorReviewMetadata() {
  const utils = trpc.useUtils();
  
  return trpc.locations.tripadvisor.updateReviewMetadata.useMutation({
    onSuccess: () => {
      // Invalidate reviews query to refetch updated data
      utils.locations.tripadvisor.getReviews.invalidate();
    },
  });
}

// ==========================================
// BOOKING PLATFORM HOOKS
// ==========================================

/**
 * Hook to get Booking Business Profile
 */
export function useBookingProfile(locationId: string, enabled = true) {
  const { data, error, isLoading, refetch } = trpc.locations.booking.getProfile.useQuery(
    { locationId, platform: 'booking' as const },
    {
      enabled: enabled && !!locationId,
      refetchOnWindowFocus: false,
      staleTime: 60000,
    }
  );

  return {
    profile: data || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get Booking Analytics
 */
export function useBookingAnalytics(
  locationId: string,
  startDate: string,
  endDate: string,
  enabled = true
) {
  const { data, error, isLoading, refetch } = trpc.locations.booking.getAnalytics.useQuery(
    { locationId, platform: 'booking' as const, startDate, endDate },
    {
      enabled: enabled && !!locationId && !!startDate && !!endDate,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  return {
    analytics: data || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get Booking Reviews
 */
export function useBookingReviews(
  locationId: string,
  filters?: any,
  pagination?: { page?: number; limit?: number },
  enabled = true
) {
  const { data, error, isLoading, refetch } = trpc.locations.booking.getReviews.useQuery(
    { locationId, platform: 'booking' as const, filters, pagination },
    {
      enabled: enabled && !!locationId,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      placeholderData: (previousData) => previousData, // Preserve previous data during refetching to prevent showing 0
    }
  );

  return {
    reviews: data?.reviews || [],
    pagination: data?.pagination || { page: 1, limit: 10, totalCount: data?.allTimeStats?.totalReviews || 0, totalPages: data?.allTimeStats?.totalReviews / 10 ? Math.ceil(data?.allTimeStats?.totalReviews / 10) : 0 },
    aggregates: data?.aggregates || null,
    allTimeStats: data?.allTimeStats || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get Booking Enhanced Graph Data
 */
export function useBookingEnhancedGraph(
  locationId: string,
  startDate: string,
  endDate: string,
  enabled = true
) {
  const { data, error, isLoading, refetch } = trpc.locations.booking.getEnhancedGraph.useQuery(
    { locationId, platform: 'booking' as const, startDate, endDate },
    {
      enabled: enabled && !!locationId && !!startDate && !!endDate,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  return {
    daily: data?.daily || [],
    overview: data?.overview || null,
    trends: data?.trends || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to update Booking Review Metadata
 */
export function useUpdateBookingReviewMetadata() {
  const utils = trpc.useUtils();
  
  return trpc.locations.booking.updateReviewMetadata.useMutation({
    onSuccess: () => {
      // Invalidate reviews query to refetch updated data
      utils.locations.booking.getReviews.invalidate();
    },
  });
}
