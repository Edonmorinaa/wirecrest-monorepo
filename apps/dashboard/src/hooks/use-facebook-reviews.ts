import { useState, useEffect, useCallback } from 'react';

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

const useFacebookReviews = (teamSlug?: string, filters: UseFacebookReviewsFilters = {}) => {
  const [data, setData] = useState<FacebookReviewsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build query parameters
  const buildQueryParams = useCallback((filterParams: UseFacebookReviewsFilters) => {
    const params = new URLSearchParams();

    if (filterParams.page) params.set('page', filterParams.page.toString());
    if (filterParams.limit) params.set('limit', filterParams.limit.toString());
    if (filterParams.search) params.set('search', filterParams.search);
    if (filterParams.isRecommended !== undefined)
      params.set('isRecommended', filterParams.isRecommended.toString());
    if (filterParams.hasLikes !== undefined)
      params.set('hasLikes', filterParams.hasLikes.toString());
    if (filterParams.hasComments !== undefined)
      params.set('hasComments', filterParams.hasComments.toString());
    if (filterParams.hasPhotos !== undefined)
      params.set('hasPhotos', filterParams.hasPhotos.toString());
    if (filterParams.hasTags !== undefined) params.set('hasTags', filterParams.hasTags.toString());
    if (filterParams.sentiment) params.set('sentiment', filterParams.sentiment);
    if (filterParams.sortBy) params.set('sortBy', filterParams.sortBy);
    if (filterParams.sortOrder) params.set('sortOrder', filterParams.sortOrder);
    if (filterParams.isRead !== undefined) params.set('isRead', filterParams.isRead.toString());
    if (filterParams.isImportant !== undefined)
      params.set('isImportant', filterParams.isImportant.toString());
    if (filterParams.minLikes) params.set('minLikes', filterParams.minLikes.toString());
    if (filterParams.maxLikes) params.set('maxLikes', filterParams.maxLikes.toString());
    if (filterParams.minComments) params.set('minComments', filterParams.minComments.toString());
    if (filterParams.maxComments) params.set('maxComments', filterParams.maxComments.toString());

    return params.toString();
  }, []);

  const fetchReviews = useCallback(
    async (filterParams: UseFacebookReviewsFilters = {}) => {
      if (!teamSlug) return;

      setIsLoading(true);
      setError(null);

      try {
        const queryParams = buildQueryParams(filterParams);
        const response = await fetch(`/api/teams/${teamSlug}/facebook/reviews?${queryParams}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch reviews');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching Facebook reviews:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [teamSlug, buildQueryParams]
  );

  const refreshReviews = useCallback(() => {
    fetchReviews(filters);
  }, [fetchReviews, filters]);

  // Initial fetch
  useEffect(() => {
    if (teamSlug) {
      fetchReviews(filters);
    }
  }, [teamSlug, filters, fetchReviews]);

  return {
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
    isError: !!error,
    error,
    refreshReviews,
  };
};

export default useFacebookReviews;
