import { useParams } from 'next/navigation';

import { trpc } from 'src/lib/trpc/client';
import { GoogleReviewWithMetadata } from 'src/actions/types/reviews';

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

  // Use tRPC query instead of manual state management
  const { data, error, isLoading, refetch } = trpc.reviews.google.useQuery(
    {
      teamSlug: teamSlug as string,
      filters: {
        ...filters,
        isRead: filters.isRead === '' ? undefined : (filters.isRead as boolean),
        isImportant: filters.isImportant === '' ? undefined : (filters.isImportant as boolean),
      },
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
    error: error?.message || null,
    refetch,
    refreshReviews: refetch,
    mutate: refetch
  };
};

export default useGoogleReviews;
