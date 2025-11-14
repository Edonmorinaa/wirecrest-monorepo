import { useRouter } from 'next/router';
import { Prisma } from '@prisma/client';

import { trpc } from 'src/lib/trpc/client';

// Use the same type as the API endpoint
type FacebookProfileWithOverview = Prisma.FacebookBusinessProfileGetPayload<{
  include: {
    overview: {
      include: {
        sentimentAnalysis: true;
        emotionalAnalysis: true;
        reviewQuality: true;
        contentLength: true;
        keywords: {
          orderBy: { count: 'desc' };
          take: 20;
        };
        tags: {
          orderBy: { count: 'desc' };
          take: 20;
        };
        topics: {
          orderBy: { count: 'desc' };
          take: 10;
        };
        competitorMentions: {
          orderBy: { count: 'desc' };
          take: 10;
        };
        recentReviews: {
          orderBy: { reviewDate: 'desc' };
          take: 10;
        };
        reviewsTrends: {
          orderBy: { periodStart: 'desc' };
          take: 12;
        };
        seasonalPatterns: {
          orderBy: { monthNumber: 'asc' };
        };
        recommendationDistribution: true;
        facebookPeriodicalMetric: {
          orderBy: { periodKey: 'asc' };
          include: {
            keywords: {
              orderBy: { count: 'desc' };
              take: 10;
            };
            tags: {
              orderBy: { count: 'desc' };
              take: 10;
            };
            topics: {
              orderBy: { count: 'desc' };
              take: 5;
            };
          };
        };
      };
    };
  };
}>;

/**
 * Hook for fetching Facebook overview with complete nested data using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useFacebookOverview = (slug?: string) => {
  const { query, isReady } = useRouter();
  const rawTeamSlug = slug || (isReady ? query.slug : null);
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  const { data, error, isLoading, refetch } = trpc.platforms.facebookProfile.useQuery(
    { slug: teamSlug! },
    {
      enabled: !!teamSlug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60000, // 1 minute
      retry: 3,
    }
  );

  return {
    profile: data as FacebookProfileWithOverview | undefined,
    overview: data?.overview || null,
    isLoading,
    error: error?.message || null,
    mutate: refetch,
    refetch,
  };
};

export default useFacebookOverview;
