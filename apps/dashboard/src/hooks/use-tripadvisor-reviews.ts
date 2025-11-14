import { useParams } from 'next/navigation';

import { useTeamSlug } from './use-subdomain';
import { trpc } from 'src/lib/trpc/client';

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

/**
 * Hook for fetching TripAdvisor reviews using tRPC
 * Replaces manual state management with React Query (via tRPC)
 */
const useTripAdvisorReviews = (slug?: string, filters: UseTripAdvisorReviewsFilters = {}) => {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const teamSlug = slug || subdomainTeamSlug || params.slug;

  // Use tRPC query instead of manual state management
  const { data, error, isLoading, refetch } = trpc.reviews.getTripAdvisorReviews.useQuery(
    {
      slug: teamSlug as string,
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
      keepPreviousData: true,
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
    error: error?.message || null,
    refetch,
  };
};

export default useTripAdvisorReviews;
