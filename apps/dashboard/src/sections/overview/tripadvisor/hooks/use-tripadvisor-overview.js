import useSWR from 'swr';
import { useParams } from 'next/navigation';

import { useTeamSlug } from '@/hooks/use-subdomain';

import fetcher from 'src/lib/fetcher';

export function useTripAdvisorOverview(teamSlug) {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const slug = teamSlug || subdomainTeamSlug || params?.slug;

  const { data, error, isLoading, mutate } = useSWR(
    slug ? `/api/teams/${slug}/tripadvisor/overview` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 0, // Don't retry on 404 errors
      errorRetryInterval: 5000,
      onError: (err) => {
        // Silently handle 404 errors (profile not found) as this is expected
        if (err?.status !== 404) {
          console.error('TripAdvisor overview fetch error:', err);
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
    mutate
  };
}
