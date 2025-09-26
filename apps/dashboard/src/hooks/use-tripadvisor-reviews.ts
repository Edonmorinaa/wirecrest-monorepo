import { useParams } from 'next/navigation';
import { useTeamSlug } from './use-subdomain';
import { useMemo, useState, useEffect, useCallback } from 'react';

interface UseTripAdvisorReviewsFilters {
  page?: number;
  limit?: number;
  ratings?: number[];
  tripType?: string[];
  hasPhotos?: boolean;
  hasOwnerResponse?: boolean;
  helpfulVotes?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: 'publishedDate' | 'rating' | 'helpfulVotes' | 'visitDate';
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean | string;
  isImportant?: boolean | string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
}

interface TripAdvisorReviewsResponse {
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
    tripTypeDistribution: { [key: string]: number };
    totalHelpfulVotes: number;
    totalPhotos: number;
    averageHelpfulVotes: number;
    sentimentScore: number;
    qualityScore: number;
    unread: number;
    withPhotos: number;
    withOwnerResponse: number;
    responseRate: number;
  };
}

const useTripAdvisorReviews = (slug?: string, filters: UseTripAdvisorReviewsFilters = {}) => {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const teamSlug = slug || subdomainTeamSlug || params.slug;

  const [data, setData] = useState<TripAdvisorReviewsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build query parameters
  const buildQueryParams = useCallback((filterParams: UseTripAdvisorReviewsFilters) => {
    const params = new URLSearchParams();

    if (filterParams.page) params.set('page', filterParams.page.toString());
    if (filterParams.limit) params.set('limit', filterParams.limit.toString());
    if (filterParams.ratings && filterParams.ratings.length > 0) {
      params.set('rating', filterParams.ratings.join(','));
    }
    if (filterParams.tripType && filterParams.tripType.length > 0) {
      params.set('tripType', filterParams.tripType.join(','));
    }
    if (filterParams.hasPhotos !== undefined)
      params.set('hasPhotos', filterParams.hasPhotos.toString());
    if (filterParams.hasOwnerResponse !== undefined)
      params.set('hasOwnerResponse', filterParams.hasOwnerResponse.toString());
    if (filterParams.helpfulVotes !== undefined)
      params.set('helpfulVotes', filterParams.helpfulVotes.toString());
    if (filterParams.sentiment) params.set('sentiment', filterParams.sentiment);
    if (filterParams.search) params.set('search', filterParams.search);
    if (filterParams.sortBy) params.set('sortBy', filterParams.sortBy);
    if (filterParams.sortOrder) params.set('sortOrder', filterParams.sortOrder);
    if (filterParams.isRead !== undefined && filterParams.isRead !== '')
      params.set('isRead', filterParams.isRead.toString());
    if (filterParams.isImportant !== undefined && filterParams.isImportant !== '')
      params.set('isImportant', filterParams.isImportant.toString());
    if (filterParams.dateRange) params.set('dateRange', filterParams.dateRange);
    if (filterParams.startDate) params.set('startDate', filterParams.startDate);
    if (filterParams.endDate) params.set('endDate', filterParams.endDate);

    return params.toString();
  }, []);

  // Memoize the query string to prevent unnecessary re-renders
  const queryString = useMemo(() => buildQueryParams(filters), [buildQueryParams, filters]);

  const fetchReviews = useCallback(
    async (filterParams: UseTripAdvisorReviewsFilters = {}) => {
      if (!teamSlug) return;

      setIsLoading(true);
      setError(null);

      try {
        const queryParams = buildQueryParams(filterParams);
        const response = await fetch(`/api/tripadvisor/${teamSlug}/reviews?${queryParams}`, {
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
        console.error('Error fetching TripAdvisor reviews:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [teamSlug, buildQueryParams]
  );

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
      hasPreviousPage: false,
    },
    stats: data?.stats || {
      total: 0,
      averageRating: 0,
      ratingDistribution: {},
      tripTypeDistribution: {},
      totalHelpfulVotes: 0,
      totalPhotos: 0,
      averageHelpfulVotes: 0,
      sentimentScore: 0,
      qualityScore: 0,
      unread: 0,
      withPhotos: 0,
      withOwnerResponse: 0,
      responseRate: 0,
    },
    isLoading,
    isError: !!error,
    error,
    refreshReviews,
    mutate: refreshReviews,
  };
};

export default useTripAdvisorReviews;
