import type { ApiResponse } from 'src/types';

import { Prisma } from '@prisma/client';

import { trpc } from 'src/lib/trpc/client';
import { CACHE_TIMES } from 'src/lib/trpc/cache';

// Use the same type as the API
type TripAdvisorProfileWithOverview = Prisma.TripAdvisorBusinessProfileGetPayload<{
  include: {
    overview: {
      include: {
        sentimentAnalysis: true;
        topKeywords: {
          orderBy: { count: 'desc' };
          take: 20;
        };
        topTags: {
          orderBy: { count: 'desc' };
          take: 20;
        };
        recentReviews: {
          orderBy: { publishedDate: 'desc' };
          take: 10;
        };
        ratingDistribution: {
          include: {
            serviceRatings: true;
            foodRatings: true;
            valueRatings: true;
            atmosphereRatings: true;
            cleanlinessRatings: true;
            locationRatings: true;
            roomsRatings: true;
            sleepQualityRatings: true;
          };
        };
        tripAdvisorPeriodicalMetric: {
          orderBy: { periodKey: 'asc' };
          include: {
            topKeywords: {
              orderBy: { count: 'desc' };
              take: 10;
            };
            topTags: {
              orderBy: { count: 'desc' };
              take: 10;
            };
          };
        };
      };
    };
    addressObj: true;
    subcategories: true;
    amenities: true;
    reviewTags: {
      orderBy: { reviews: 'desc' };
      take: 10;
    };
    photos: {
      take: 5;
    };
  };
}>;

/**
 * Hook for TripAdvisor Business Profile data using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useTripAdvisorOverview = (slug?: string) => {
  const teamSlug = typeof slug === 'string' ? slug : null;

  const { data, error, isLoading, refetch } = trpc.platforms.tripadvisorProfile.useQuery(
    { slug: teamSlug! },
    {
      suspense: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: CACHE_TIMES.PLATFORM_PROFILE.staleTime,
      gcTime: CACHE_TIMES.PLATFORM_PROFILE.gcTime,
      retry: 0, // Don't retry on 404 errors
      retryDelay: 5000,
      onError: (error) => {
        // Silently handle 404 errors (profile not found) as this is expected
        if (!error.message.includes('404')) {
          console.error('TripAdvisor overview fetch error:', error);
        }
      },
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
  const topTags = overview?.topTags || [];
  const recentReviews = overview?.recentReviews || [];
  const ratingDistribution = overview?.ratingDistribution || null;
  const periodicalMetrics = overview?.tripAdvisorPeriodicalMetric || [];

  return {
    businessProfile,
    overview,
    sentimentAnalysis,
    topKeywords,
    topTags,
    recentReviews,
    ratingDistribution,
    periodicalMetrics,
    isLoading,
    isError: error || null,
    refreshOverview,
    mutate: refetch, // Alias for backwards compatibility
  };
};

export default useTripAdvisorOverview;
