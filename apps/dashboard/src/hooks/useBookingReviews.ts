import type { BookingReview, ReviewMetadata } from '@prisma/client';

import { useRouter } from 'next/router';

import { trpc } from 'src/lib/trpc/client';

export interface BookingReviewWithMetadata extends BookingReview {
  reviewMetadata?: ReviewMetadata | null;
}

interface BookingReviewsResponse {
  reviews: BookingReviewWithMetadata[];
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
    averageCleanlinessRating: number;
    averageComfortRating: number;
    averageLocationRating: number;
    averageFacilitiesRating: number;
    averageStaffRating: number;
    averageValueForMoneyRating: number;
    averageWifiRating: number;
    soloTravelers: number;
    couples: number;
    familiesWithYoungChildren: number;
    familiesWithOlderChildren: number;
    groupsOfFriends: number;
    businessTravelers: number;
    averageLengthOfStay: number;
    shortStays: number;
    mediumStays: number;
    longStays: number;
    verifiedStays: number;
    responseRate: number;
    unread: number;
    withResponse: number;
    topNationalities: string[];
    mostPopularRoomTypes: string[];
  };
}

interface UseBookingReviewsFilters {
  page?: number;
  limit?: number;
  rating?: number | number[];
  guestType?: string | string[];
  lengthOfStay?: string;
  nationality?: string;
  roomType?: string;
  isVerifiedStay?: boolean;
  hasResponse?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: 'publishedDate' | 'rating' | 'overallRating' | 'guestType';
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean;
  isImportant?: boolean;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Hook for fetching Booking.com reviews using tRPC
 * Replaces SWR with React Query (via tRPC)
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
  const { query, isReady } = useRouter();
  const rawTeamSlug = slug || (isReady ? query.slug : null);
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  // Use bookingOverview which includes recentReviews
  // For full review management, use inbox instead
  const { data, error, isLoading, refetch } = trpc.platforms.bookingOverview.useQuery(
    { slug: teamSlug! },
    {
      enabled: !!teamSlug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000,
      keepPreviousData: true,
    }
  );

  // Extract and format data
  const reviews = data?.overview?.recentReviews || [];
  const stats = data?.overview?.stats || {
    total: 0,
    averageRating: 0,
    averageCleanlinessRating: 0,
    averageComfortRating: 0,
    averageLocationRating: 0,
    averageFacilitiesRating: 0,
    averageStaffRating: 0,
    averageValueForMoneyRating: 0,
    averageWifiRating: 0,
    soloTravelers: 0,
    couples: 0,
    familiesWithYoungChildren: 0,
    familiesWithOlderChildren: 0,
    groupsOfFriends: 0,
    businessTravelers: 0,
    averageLengthOfStay: 0,
    shortStays: 0,
    mediumStays: 0,
    longStays: 0,
    verifiedStays: 0,
    responseRate: 0,
    unread: 0,
    withResponse: 0,
    topNationalities: [],
    mostPopularRoomTypes: [],
  };

  return {
    reviews,
    stats,
    data,
    isLoading,
    error,
    mutate: refetch,
    refetch,
  };
};

export default useBookingReviews;
