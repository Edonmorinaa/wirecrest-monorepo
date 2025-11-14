import { useParams } from 'next/navigation';

import { useTeamSlug } from './use-subdomain';
import { GoogleReviewWithMetadata } from 'src/actions/types/reviews';
import { trpc } from 'src/lib/trpc/client';

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
  reviews: GoogleReviewWithMetadata[];
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
    withResponse: number;
    unread: number;
  };
}

/**
 * Hook for fetching Google reviews using tRPC
 * Replaces manual state management with React Query (via tRPC)
 */
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
    const queryParams = new URLSearchParams();
    
    if (filterParams.page) queryParams.set('page', filterParams.page.toString());
    if (filterParams.limit) queryParams.set('limit', filterParams.limit.toString());
    if (filterParams.minRating) queryParams.set('minRating', filterParams.minRating.toString());
    if (filterParams.maxRating) queryParams.set('maxRating', filterParams.maxRating.toString());
    if (filterParams.ratings && filterParams.ratings.length > 0) {
      queryParams.set('ratings', filterParams.ratings.join(','));
    }
    if (filterParams.hasResponse !== undefined) queryParams.set('hasResponse', filterParams.hasResponse.toString());
      if (filterParams.sentiment) queryParams.set('sentiment', filterParams.sentiment);
    if (filterParams.search) queryParams.set('search', filterParams.search);
    if (filterParams.sortBy) queryParams.set('sortBy', filterParams.sortBy);
    if (filterParams.sortOrder) queryParams.set('sortOrder', filterParams.sortOrder);
    if (filterParams.isRead !== undefined && filterParams.isRead !== '') queryParams.set('isRead', filterParams.isRead.toString());
    if (filterParams.isImportant !== undefined && filterParams.isImportant !== '') queryParams.set('isImportant', filterParams.isImportant.toString());

    return queryParams.toString();
  }, []);

  // Memoize the query string to prevent unnecessary re-renders
  const queryString = useMemo(() => buildQueryParams(filters), [buildQueryParams, filters]);

  const fetchReviews = useCallback(async (filterParams: UseGoogleReviewsFilters = {}) => {
    if (!teamSlug) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getGoogleReviews(teamSlug as string, filterParams as ReviewFilters);
      setData(result);
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
