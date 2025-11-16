import { useParams } from 'next/navigation';

import { trpc } from 'src/lib/trpc/client';

import { useTeamSlug } from './use-subdomain';

interface UseTripAdvisorReviewsFilters {
  page?: number;
  limit?: number;
  rating?: number | number[];
  tripType?: string | string[];
  hasPhotos?: boolean;
  hasOwnerResponse?: boolean;
  helpfulVotes?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: 'publishedDate' | 'rating' | 'helpfulVotes' | 'visitDate';
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean;
  isImportant?: boolean;
  minHelpfulVotes?: number;
  maxHelpfulVotes?: number;
  dateRange?: 'today' | 'week' | 'month' | '3months' | '6months' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
  visitDate?: string;
}

/**
 * Hook for fetching TripAdvisor reviews using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useTripAdvisorReviews = (slug?: string, filters: UseTripAdvisorReviewsFilters = {}) => {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const rawTeamSlug = slug || subdomainTeamSlug || params.slug;
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  // Use tRPC query instead of SWR
  const { data, error, isLoading, refetch } = trpc.reviews.tripadvisor.useQuery(
    {
      teamSlug: teamSlug!,
      ...filters,
    },
    {
      enabled: !!teamSlug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000,
    }
  );

  // Extract data
  const reviews = data?.reviews || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  const stats = data?.stats || {
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
  };

  return {
    reviews,
    pagination,
    stats,
    data,
    isLoading,
    error,
    mutate: refetch, // Alias for backwards compatibility
    refetch,
  };
};

export default useTripAdvisorReviews;
