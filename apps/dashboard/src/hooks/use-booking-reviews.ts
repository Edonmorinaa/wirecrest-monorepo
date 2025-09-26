import { useParams } from 'next/navigation';
import { useTeamSlug } from './use-subdomain';
import { useMemo, useState, useEffect, useCallback } from 'react';

interface UseBookingReviewsFilters {
  page?: number;
  limit?: number;
  minRating?: number;
  maxRating?: number;
  ratings?: number[];
  hasResponse?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: 'publishedDate' | 'rating' | 'responseStatus';
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean | string;
  isImportant?: boolean | string;
  guestType?: string;
  lengthOfStay?: string;
  nationality?: string;
  roomType?: string;
  isVerifiedStay?: boolean;
}

interface BookingReviewsResponse {
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
    verifiedStays: number;
    responseRate: number;
    unread: number;
    withResponse: number;
  };
}

const useBookingReviews = (slug?: string, filters: UseBookingReviewsFilters = {}) => {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const teamSlug = slug || subdomainTeamSlug || params.slug;

  const [data, setData] = useState<BookingReviewsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build query parameters
  const buildQueryParams = useCallback((filterParams: UseBookingReviewsFilters) => {
    const queryParams = new URLSearchParams();

    if (filterParams.page) queryParams.set('page', filterParams.page.toString());
    if (filterParams.limit) queryParams.set('limit', filterParams.limit.toString());
    if (filterParams.minRating) queryParams.set('minRating', filterParams.minRating.toString());
    if (filterParams.maxRating) queryParams.set('maxRating', filterParams.maxRating.toString());
    if (filterParams.ratings && filterParams.ratings.length > 0) {
      queryParams.set('ratings', filterParams.ratings.join(','));
    }
    if (filterParams.hasResponse !== undefined)
      queryParams.set('hasResponse', filterParams.hasResponse.toString());
    if (filterParams.sentiment) queryParams.set('sentiment', filterParams.sentiment);
    if (filterParams.search) queryParams.set('search', filterParams.search);
    if (filterParams.sortBy) queryParams.set('sortBy', filterParams.sortBy);
    if (filterParams.sortOrder) queryParams.set('sortOrder', filterParams.sortOrder);
    if (filterParams.isRead !== undefined && filterParams.isRead !== '')
      queryParams.set('isRead', filterParams.isRead.toString());
    if (filterParams.isImportant !== undefined && filterParams.isImportant !== '')
      queryParams.set('isImportant', filterParams.isImportant.toString());
    if (filterParams.guestType) queryParams.set('guestType', filterParams.guestType);
    if (filterParams.lengthOfStay) queryParams.set('lengthOfStay', filterParams.lengthOfStay);
    if (filterParams.nationality) queryParams.set('nationality', filterParams.nationality);
    if (filterParams.roomType) queryParams.set('roomType', filterParams.roomType);
    if (filterParams.isVerifiedStay !== undefined)
      queryParams.set('isVerifiedStay', filterParams.isVerifiedStay.toString());

    return queryParams.toString();
  }, []);

  // Memoize the query string to prevent unnecessary re-renders
  const queryString = useMemo(() => buildQueryParams(filters), [buildQueryParams, filters]);

  const fetchReviews = useCallback(
    async (filterParams: UseBookingReviewsFilters = {}) => {
      if (!teamSlug) return;

      setIsLoading(true);
      setError(null);

      try {
        const queryParams = buildQueryParams(filterParams);
        const response = await fetch(`/api/teams/${teamSlug}/booking/reviews?${queryParams}`, {
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
        console.error('Error fetching Booking reviews:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [teamSlug, buildQueryParams]
  );

  const refreshReviews = useCallback(() => {
    void fetchReviews(filters);
  }, [fetchReviews, filters]);

  // Debounced effect to prevent excessive API calls
  useEffect(() => {
    if (!teamSlug) return undefined;

    const timeoutId = setTimeout(() => {
      void fetchReviews(filters);
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
      verifiedStays: 0,
      responseRate: 0,
      unread: 0,
      withResponse: 0,
    },
    isLoading,
    isError: !!error,
    error,
    refreshReviews,
    mutate: refreshReviews,
  };
};

export default useBookingReviews;
