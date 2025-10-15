import useSWR from 'swr';
import { useMemo } from 'react';
import { useRouter } from 'next/router';

import { getGoogleReviews } from 'src/actions/reviews';
import type { GoogleReviewsResponse } from 'src/actions/types/reviews';

interface UseGoogleReviewsFilters {
  page?: number;
  limit?: number;
  minRating?: number;
  maxRating?: number;
  ratings?: number[];
  hasResponse?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: 'publishedAtDate' | 'rating' | 'responseStatus';
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean;
  isImportant?: boolean;
}

const useGoogleReviews = (slug?: string, filters: UseGoogleReviewsFilters = {}) => {
  const { query, isReady } = useRouter();
  const rawTeamSlug = slug || (isReady ? query.slug : null);
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.page) params.set('page', filters.page.toString());
    if (filters.limit) params.set('limit', filters.limit.toString());
    if (filters.minRating) params.set('minRating', filters.minRating.toString());
    if (filters.maxRating) params.set('maxRating', filters.maxRating.toString());
    if (filters.ratings && filters.ratings.length > 0) {
      params.set('ratings', filters.ratings.join(','));
    }
    if (filters.hasResponse !== undefined)
      params.set('hasResponse', filters.hasResponse.toString());
    if (filters.sentiment) params.set('sentiment', filters.sentiment);
    if (filters.search) params.set('search', filters.search);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.isRead !== undefined) params.set('isRead', filters.isRead.toString());
    if (filters.isImportant !== undefined)
      params.set('isImportant', filters.isImportant.toString());

    return params.toString();
  }, [filters]);

  const { data, error, isLoading, mutate } = useSWR<GoogleReviewsResponse | null>(
    teamSlug ? `google-reviews-${teamSlug}-${queryParams}` : null,
    () => getGoogleReviews(teamSlug!, filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // 30 seconds
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  const refreshReviews = async () => {
    await mutate();
  };

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
      averageRating: 0,
      withResponse: 0,
      unread: 0,
    },
    isLoading,
    isError: error,
    refreshReviews,
    mutate,
  };
};

export default useGoogleReviews;
