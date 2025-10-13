import type { ApiResponse } from 'src/types';

import useSWR from 'swr';
import { useRouter } from 'next/router';
import { Prisma } from '@prisma/client';

import fetcher from 'src/lib/fetcher';

// Use the same type as the API
type BookingProfileWithOverview = Prisma.BookingBusinessProfileGetPayload<{
  include: {
    overview: {
      include: {
        sentimentAnalysis: true;
        topKeywords: {
          orderBy: { count: 'desc' };
          take: 20;
        };
        recentReviews: {
          orderBy: { publishedDate: 'desc' };
          take: 10;
        };
        ratingDistribution: true;
        bookingPeriodicalMetric: {
          orderBy: { periodKey: 'asc' };
          include: {
            topKeywords: {
              orderBy: { count: 'desc' };
              take: 10;
            };
          };
        };
      };
    };
    rooms: true;
    facilities: true;
    photos: {
      take: 5;
    };
    businessMetadata: true;
  };
}>;

const useBookingOverview = (slug?: string) => {
  const { query, isReady } = useRouter();
  const rawTeamSlug = slug || (isReady ? query.slug : null);
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<BookingProfileWithOverview>>(
    teamSlug ? `/api/teams/${teamSlug}/booking/overview` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 0, // Don't retry on 404 errors
      errorRetryInterval: 5000,
      onError: (error) => {
        // Silently handle 404 errors (profile not found) as this is expected
        if (error?.status !== 404) {
          console.error('Booking.com overview fetch error:', error);
        }
      },
    }
  );

  const refreshOverview = async () => {
    await mutate();
  };

  // Extract data with proper fallbacks
  const businessProfile = data?.data || null;
  const overview = businessProfile?.overview || null;
  const sentimentAnalysis = overview?.sentimentAnalysis || null;
  const topKeywords = overview?.topKeywords || [];
  const recentReviews = overview?.recentReviews || [];
  const ratingDistribution = overview?.ratingDistribution || null;
  const periodicalMetrics = overview?.bookingPeriodicalMetric || [];

  return {
    businessProfile,
    overview,
    sentimentAnalysis,
    topKeywords,
    recentReviews,
    ratingDistribution,
    periodicalMetrics,
    isLoading,
    isError: error,
    refreshOverview,
    mutate,
  };
};

export default useBookingOverview;
