import type { Prisma } from '@prisma/client';

import { useParams } from 'next/navigation';

import { trpc } from 'src/lib/trpc/client';

import { useTeamSlug } from './use-subdomain';

/**
 * TripAdvisor Review with relations from Prisma
 */
export type TripAdvisorReviewWithRelations = Prisma.TripAdvisorReviewGetPayload<{
  include: {
    reviewMetadata: true;
    photos: true;
    subRatings: true;
    reviewerBadges: true;
  };
}>;

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Rating distribution map (1-5 stars)
 */
export interface RatingDistribution {
  1?: number;
  2?: number;
  3?: number;
  4?: number;
  5?: number;
}

/**
 * Trip type distribution map
 */
export interface TripTypeDistribution {
  FAMILY?: number;
  COUPLES?: number;
  SOLO?: number;
  BUSINESS?: number;
  FRIENDS?: number;
  [key: string]: number | undefined;
}

/**
 * Statistics for TripAdvisor reviews
 */
export interface TripAdvisorReviewStats {
  total: number;
  averageRating: number;
  ratingDistribution: RatingDistribution;
  tripTypeDistribution: TripTypeDistribution;
  totalHelpfulVotes: number;
  totalPhotos: number;
  averageHelpfulVotes: number;
  sentimentScore: number;
  qualityScore: number;
  unread: number;
  withPhotos: number;
  withOwnerResponse: number;
  responseRate: number;
}

/**
 * Hook filters interface for TripAdvisor reviews
 */
export interface UseTripAdvisorReviewsFilters {
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

/**
 * Response from the TripAdvisor reviews API
 */
export interface TripAdvisorReviewsResponse {
  reviews: TripAdvisorReviewWithRelations[];
  pagination: PaginationInfo;
  stats: TripAdvisorReviewStats;
}

/**
 * Return type for the useTripAdvisorReviews hook
 * Note: No isLoading or error - handled by Suspense and error boundaries
 */
export interface UseTripAdvisorReviewsReturn {
  data: TripAdvisorReviewsResponse;
  reviews: TripAdvisorReviewWithRelations[];
  pagination: PaginationInfo;
  stats: TripAdvisorReviewStats;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching TripAdvisor reviews using tRPC
 * Replaces manual state management with React Query (via tRPC)
 * 
 * @param slug - Team slug to fetch reviews for
 * @param filters - Optional filters to apply to the reviews
 * @returns Reviews data, pagination, stats, loading state, error state, and refetch function
 */
const useTripAdvisorReviews = (
  slug?: string, 
  filters: UseTripAdvisorReviewsFilters = {}
): UseTripAdvisorReviewsReturn => {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const teamSlug = slug || subdomainTeamSlug || (params.slug as string);

  // Use tRPC query with Suspense enabled for proper loading states
  // Note: reviewFiltersSchema expects all fields flattened at the top level
  const { data, refetch } = trpc.reviews.tripadvisor.useQuery(
    {
      teamSlug: teamSlug as string,
      page: filters.page,
      limit: filters.limit,
      rating: filters.ratings, // Schema expects 'rating' which can be number or array
      sentiment: filters.sentiment,
      search: filters.search,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      isRead: filters.isRead === '' ? undefined : (filters.isRead as boolean),
      isImportant: filters.isImportant === '' ? undefined : (filters.isImportant as boolean),
      hasResponse: filters.hasOwnerResponse,
      dateRange: filters.dateRange,
      startDate: filters.startDate,
      endDate: filters.endDate,
    },
    {
      suspense: true, // Enable Suspense for loading states
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // With Suspense enabled, data is always available when component renders
  // Type assertion is safe because Suspense ensures data is loaded
  return {
    data: data as unknown as TripAdvisorReviewsResponse,
    reviews: data.reviews as unknown as TripAdvisorReviewWithRelations[],
    pagination: data.pagination as PaginationInfo,
    stats: data.stats as TripAdvisorReviewStats,
    refetch: async () => {
      await refetch();
    },
  };
};

export default useTripAdvisorReviews;
