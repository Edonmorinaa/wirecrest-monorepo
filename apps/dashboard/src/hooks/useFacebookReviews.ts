'use client';

import { useParams } from 'next/navigation';

import { trpc } from 'src/lib/trpc/client';

interface FacebookReviewFilters {
  page?: number;
  limit?: number;
  isRecommended?: boolean;
  hasLikes?: boolean;
  hasComments?: boolean;
  hasPhotos?: boolean;
  hasTags?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  isRead?: boolean;
  isImportant?: boolean;
  minLikes?: number;
  maxLikes?: number;
  minComments?: number;
  maxComments?: number;
}

/**
 * Hook for fetching Facebook reviews using tRPC
 * Replaces manual state management with React Query (via tRPC)
 */
export function useFacebookReviews(filters: FacebookReviewFilters = {}) {
  const params = useParams();
  const { slug } = params;

  // Use tRPC query instead of manual state management
  const { data, error, isLoading, refetch } = trpc.reviews.getFacebookReviews.useQuery(
    {
      slug: slug as string,
      filters,
    },
    {
      enabled: !!slug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000, // 30 seconds
      keepPreviousData: true,
    }
  );

  return {
    reviews: data?.reviews || [],
    stats: data?.stats || {
      total: 0,
      recommendationRate: 0,
      recommendedCount: 0,
      notRecommendedCount: 0,
      totalLikes: 0,
      totalComments: 0,
      totalPhotos: 0,
      averageEngagement: 0,
      sentimentScore: 0,
      qualityScore: 0,
      unread: 0,
      withPhotos: 0,
      withTags: 0,
    },
    pagination: data?.pagination || {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    isLoading,
    error: error?.message || null,
    refetch,
  };
}
