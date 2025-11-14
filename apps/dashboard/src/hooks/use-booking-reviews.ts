import { useParams } from 'next/navigation';

import { useTeamSlug } from './use-subdomain';
import { trpc } from 'src/lib/trpc/client';

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

  // Use bookingOverview which includes recentReviews
  // For full review management, use inbox instead
  const { data, error, isLoading, refetch } = trpc.platforms.bookingOverview.useQuery(
    { slug: teamSlug as string },
    {
      enabled: !!teamSlug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000,
      keepPreviousData: true,
    }
  );

  return {
    data: data || null,
    reviews: data?.overview?.recentReviews || [],
    pagination: {
      page: filters.page || 1,
      limit: filters.limit || 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    stats: {
      total: 0,
      averageRating: 0,
      verifiedStays: 0,
      responseRate: 0,
      unread: 0,
      withResponse: 0,
    },
    isLoading,
    error: error?.message || null,
    refetch,
  };
};

export default useBookingReviews;
