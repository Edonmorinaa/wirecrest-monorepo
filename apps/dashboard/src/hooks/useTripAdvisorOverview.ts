import type { ApiResponse } from 'src/types';

import useSWR from 'swr';
import { Prisma } from '@prisma/client';

import { getTripAdvisorBusinessProfile } from 'src/actions/platforms';

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

const useTripAdvisorOverview = (slug?: string) => {
  const teamSlug = typeof slug === 'string' ? slug : null;

  const { data, error, isLoading, mutate } = useSWR<TripAdvisorProfileWithOverview | null>(
    teamSlug ? `tripadvisor-overview-${teamSlug}` : null,
    () => getTripAdvisorBusinessProfile(teamSlug!) as unknown as Promise<TripAdvisorProfileWithOverview | null>,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 0, // Don't retry on 404 errors
      errorRetryInterval: 5000,
      onError: (error) => {
        // Silently handle 404 errors (profile not found) as this is expected
        if (error instanceof Error && !error.message.includes('404')) {
          console.error('TripAdvisor overview fetch error:', error);
        }
      },
    }
  );

  const refreshOverview = async () => {
    await mutate();
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
    isError: error,
    refreshOverview,
    mutate,
  };
};

export default useTripAdvisorOverview;
