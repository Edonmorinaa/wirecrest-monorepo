import { useParams } from 'next/navigation';

import { trpc } from 'src/lib/trpc/client';

import { useTeamSlug } from './use-subdomain';

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

/**
 * Hook for fetching Booking.com reviews using tRPC
 * Replaces manual state management with React Query (via tRPC)
 * 
 * NOTE: Currently uses bookingOverview which returns recentReviews from the overview.
 * This is intentional - for full paginated/filtered reviews, use the unified inbox
 * (trpc.reviews.getInboxReviews with platform filter).
 * 
 * If you need full Booking reviews with pagination/filtering, consider:
 * 1. Using trpc.reviews.getInboxReviews({ platforms: ['booking'] })
 * 2. Or creating a dedicated trpc.reviews.getBookingReviews procedure
 */
const useBookingReviews = (slug?: string, filters: UseBookingReviewsFilters = {}) => {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const teamSlug = slug || subdomainTeamSlug || params.slug;

  // Use bookingReviews for full review management with pagination and filtering
  const { data, error, isLoading, refetch } = trpc.platforms.bookingReviews.useQuery(
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
      staleTime: 30000,
    }
  );

  return {
    data: data || null,
    reviews: data?.reviews || [],
    pagination: data?.pagination || {
      page: filters.page || 1,
      limit: filters.limit || 10,
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
    error: error?.message || null,
    refetch,
    refreshReviews: refetch,
  };
};

export { useBookingReviews };
export default useBookingReviews;
