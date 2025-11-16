import { trpc } from 'src/lib/trpc/client';
import { CACHE_TIMES } from 'src/lib/trpc/cache';

/**
 * Hook for TripAdvisor Business Profile data with overview using tRPC
 * Extracts nested data similar to useBookingOverview pattern
 */
const useTripAdvisorOverview = (slug?: string | string[]) => {
  const teamSlug = typeof slug === 'string' ? slug : null;

  const { data, error, isLoading, refetch } = trpc.platforms.tripadvisorProfile.useQuery(
    { slug: teamSlug! },
    {
      enabled: !!teamSlug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: CACHE_TIMES.PLATFORM_PROFILE.staleTime,
      gcTime: CACHE_TIMES.PLATFORM_PROFILE.gcTime,
      retry: 0, // Don't retry on 404 errors
      retryDelay: 5000,
    }
  );

  const refreshOverview = async () => {
    await refetch();
  };

  // Extract data with proper fallbacks
  const businessProfile = data || null;
  const overview = businessProfile?.overview || null;
  const sentimentAnalysis = overview?.sentimentAnalysis || null;
  const topKeywords = overview?.topKeywords || [];
  const recentReviews = overview?.recentReviews || [];
  const periodicalMetrics = overview?.tripAdvisorPeriodicalMetric || [];

  return {
    businessProfile,
    overview,
    sentimentAnalysis,
    topKeywords,
    recentReviews,
    periodicalMetrics,
    isLoading,
    isError: error || null,
    refreshOverview,
    mutate: refetch, // Alias for backwards compatibility
  };
};

export default useTripAdvisorOverview;

