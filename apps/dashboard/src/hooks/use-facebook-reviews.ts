import { trpc } from 'src/lib/trpc/client';

interface UseFacebookReviewsFilters {
  page?: number;
  limit?: number;
  // Facebook-specific fields
  isRecommended?: boolean;
  hasLikes?: boolean;
  hasComments?: boolean;
  hasPhotos?: boolean;
  hasTags?: boolean;
  minLikes?: number;
  maxLikes?: number;
  minComments?: number;
  maxComments?: number;
  // Common fields
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: 'date' | 'likesCount' | 'commentsCount' | 'isRecommended';
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean;
  isImportant?: boolean;
}

interface FacebookReviewsResponse {
  reviews: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  stats: {
    total: number;
    recommendationRate: number;
    recommendedCount: number;
    notRecommendedCount: number;
    totalLikes: number;
    totalComments: number;
    totalPhotos: number;
    averageEngagement: number;
    sentimentScore: number;
    qualityScore: number;
    unread: number;
    withPhotos: number;
    withTags: number;
  };
}

/**
 * Hook for fetching Facebook reviews using tRPC
 * Replaces manual state management with React Query (via tRPC)
 */
const useFacebookReviews = (teamSlug?: string, filters: UseFacebookReviewsFilters = {}) => {
  // Use tRPC query instead of manual state management
  const { data, error, isLoading, refetch } = trpc.reviews.facebook.useQuery(
    {
      teamSlug: teamSlug!,
      ...filters,
    },
    {
      enabled: !!teamSlug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000, // 30 seconds
    }
  );

  return {
    data: data || null,
    reviews: data?.reviews || [],
    pagination: data?.pagination || {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
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
    isLoading,
    error: error?.message || null,
    refetch,
  };
};

export default useFacebookReviews;
