import { useParams } from 'next/navigation';
import { useMemo, useState, useEffect, useCallback } from 'react';

import { useTeamSlug } from './use-subdomain';

interface UseGoogleReviewsFilters {
  page?: number;
  limit?: number;
  minRating?: number;
  maxRating?: number;
  ratings?: number[];
  hasResponse?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: 'publishedAtDate' | 'stars' | 'name';
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean | string;
  isImportant?: boolean | string;
}

interface GoogleReviewsResponse {
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
    averageRating: number;
    ratingDistribution: { [key: number]: number };
    withResponse: number;
    unread: number;
  };
}

const useGoogleReviews = (
  slug?: string,
  filters: UseGoogleReviewsFilters = {}
) => {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const teamSlug = slug || subdomainTeamSlug || params.slug;

  const [data, setData] = useState<GoogleReviewsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build query parameters
  const buildQueryParams = useCallback((filterParams: UseGoogleReviewsFilters) => {
    const params = new URLSearchParams();
    
    if (filterParams.page) params.set('page', filterParams.page.toString());
    if (filterParams.limit) params.set('limit', filterParams.limit.toString());
    if (filterParams.minRating) params.set('minRating', filterParams.minRating.toString());
    if (filterParams.maxRating) params.set('maxRating', filterParams.maxRating.toString());
    if (filterParams.ratings && filterParams.ratings.length > 0) {
      params.set('ratings', filterParams.ratings.join(','));
    }
    if (filterParams.hasResponse !== undefined) params.set('hasResponse', filterParams.hasResponse.toString());
    if (filterParams.sentiment) params.set('sentiment', filterParams.sentiment);
    if (filterParams.search) params.set('search', filterParams.search);
    if (filterParams.sortBy) params.set('sortBy', filterParams.sortBy);
    if (filterParams.sortOrder) params.set('sortOrder', filterParams.sortOrder);
    if (filterParams.isRead !== undefined && filterParams.isRead !== '') params.set('isRead', filterParams.isRead.toString());
    if (filterParams.isImportant !== undefined && filterParams.isImportant !== '') params.set('isImportant', filterParams.isImportant.toString());

    return params.toString();
  }, []);

  // Memoize the query string to prevent unnecessary re-renders
  const queryString = useMemo(() => buildQueryParams(filters), [buildQueryParams, filters]);

  const fetchReviews = useCallback(async (filterParams: UseGoogleReviewsFilters = {}) => {
    if (!teamSlug) return;

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = buildQueryParams(filterParams);
      const response = await fetch(`/api/teams/${teamSlug}/google/reviews?${queryParams}`, {
        // Add cache control headers for better performance
        headers: {
          'Cache-Control': 'max-age=300', // 5 minutes cache
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch reviews');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching Google reviews:', err);
    } finally {
      setIsLoading(false);
    }
  }, [teamSlug, buildQueryParams]);

  const refreshReviews = useCallback(() => {
    fetchReviews(filters);
  }, [fetchReviews, filters]);

  // Debounced effect to prevent excessive API calls
  useEffect(() => {
    if (!teamSlug) return;

    const timeoutId = setTimeout(() => {
      fetchReviews(filters);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [teamSlug, queryString, fetchReviews, filters]);

  return {
    reviews: data?.reviews || [],
    pagination: data?.pagination || {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false
    },
    stats: data?.stats || {
      total: 0,
      averageRating: 0,
      ratingDistribution: {},
      withResponse: 0,
      unread: 0
    },
    isLoading,
    isError: !!error,
    error,
    refreshReviews,
    mutate: refreshReviews
  };
};

export default useGoogleReviews;
