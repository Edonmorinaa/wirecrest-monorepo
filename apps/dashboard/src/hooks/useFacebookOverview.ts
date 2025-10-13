import type { ApiResponse } from 'src/types';

import useSWR from 'swr';
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { Prisma } from '@prisma/client';

import fetcher from 'src/lib/fetcher';

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
            emotionalBreakdown: true;
          };
        };
      };
    };
  };
}>;

const useFacebookOverview = (slug?: string) => {
  const { query, isReady } = useRouter();
  const rawTeamSlug = slug || (isReady ? query.slug : null);
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<FacebookProfileWithOverview>>(
    teamSlug ? `/api/teams/${teamSlug}/facebook/overview` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  const refreshOverview = async () => {
    await mutate();
  };

  // Process the data for easier consumption
  const processedData = useMemo(() => {
    if (!data?.data) return null;

    const profile = data.data;
    const overview = profile.overview;

    if (!overview) return null;

    return {
      businessProfile: profile,
      overview,
      sentimentAnalysis: overview.sentimentAnalysis,
      emotionalAnalysis: overview.emotionalAnalysis,
      reviewQuality: overview.reviewQuality,
      contentLength: overview.contentLength,
      keywords: overview.keywords || [],
      tags: overview.tags || [],
      topics: overview.topics || [],
      competitorMentions: overview.competitorMentions || [],
      recentReviews: overview.recentReviews || [],
      reviewsTrends: overview.reviewsTrends || [],
      seasonalPatterns: overview.seasonalPatterns || [],
      recommendationDistribution: overview.recommendationDistribution,
      periodicalMetrics: overview.facebookPeriodicalMetric || [],
    };
  }, [data]);

  return {
    data: processedData,
    businessProfile: processedData?.businessProfile,
    overview: processedData?.overview,
    sentimentAnalysis: processedData?.sentimentAnalysis,
    emotionalAnalysis: processedData?.emotionalAnalysis,
    reviewQuality: processedData?.reviewQuality,
    contentLength: processedData?.contentLength,
    keywords: processedData?.keywords || [],
    tags: processedData?.tags || [],
    topics: processedData?.topics || [],
    competitorMentions: processedData?.competitorMentions || [],
    recentReviews: processedData?.recentReviews || [],
    reviewsTrends: processedData?.reviewsTrends || [],
    seasonalPatterns: processedData?.seasonalPatterns || [],
    recommendationDistribution: processedData?.recommendationDistribution,
    periodicalMetrics: processedData?.periodicalMetrics || [],
    isLoading,
    isError: error,
    refreshOverview,
    mutate,
  };
};

export default useFacebookOverview;
