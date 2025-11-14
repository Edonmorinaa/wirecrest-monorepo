'use client';

import { trpc } from 'src/lib/trpc/client';
import { CACHE_TIMES } from 'src/lib/trpc/cache';

import { useTeamSlug } from './use-subdomain';

interface UseTeamBookingDataReturn {
  businessProfile: any;
  overview: any;
  sentimentAnalysis: any;
  topKeywords: any[];
  recentReviews: any[];
  ratingDistribution: any;
  periodicalMetrics: any[];
  refreshData: () => Promise<void>;
}

/**
 * Hook for fetching team Booking.com data using tRPC
 * Replaces manual server action call with React Query (via tRPC)
 */
export function useTeamBookingData(slug?: string): UseTeamBookingDataReturn {
  const subdomainTeamSlug = useTeamSlug();
  
  // Use slug from props, subdomain, or fallback to null
  const teamSlug = slug || subdomainTeamSlug;

  const { data, error, isLoading, refetch } = trpc.platforms.bookingOverview.useQuery(
    { slug: teamSlug! },
    {
      suspense: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: CACHE_TIMES.PLATFORM_OVERVIEW.staleTime,
      gcTime: CACHE_TIMES.PLATFORM_OVERVIEW.gcTime,
    }
  );

  const refreshData = async () => {
    await refetch();
  };

  // Extract data with proper fallbacks
  const businessProfile = data?.overview || null;
  const overview = businessProfile?.overview || null;
  const sentimentAnalysis = overview?.sentimentAnalysis || null;
  const topKeywords = overview?.topKeywords || [];
  const recentReviews = businessProfile?.recentReviews || [];
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
    refreshData,
  };
}
