import { useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import fetcher from 'src/lib/fetcher';
import type { ApiResponse } from 'src/types';
import type { BookingReview, ReviewMetadata } from '@prisma/client';

// Following the same pattern as other platforms
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
    // Sub-rating averages
    averageCleanlinessRating: number;
    averageComfortRating: number;
    averageLocationRating: number;
    averageFacilitiesRating: number;
    averageStaffRating: number;
    averageValueForMoneyRating: number;
    averageWifiRating: number;
    // Guest type breakdown
    soloTravelers: number;
    couples: number;
    familiesWithYoungChildren: number;
    familiesWithOlderChildren: number;
    groupsOfFriends: number;
    businessTravelers: number;
    // Stay length analysis
    averageLengthOfStay: number;
    shortStays: number;
    mediumStays: number;
    longStays: number;
    // Other metrics
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
  rating?: number;
  ratings?: number[];
  guestType?:
    | 'SOLO'
    | 'COUPLE'
    | 'FAMILY_WITH_YOUNG_CHILDREN'
    | 'FAMILY_WITH_OLDER_CHILDREN'
    | 'GROUP_OF_FRIENDS'
    | 'BUSINESS'
    | 'OTHER';
  lengthOfStay?: 'short' | 'medium' | 'long'; // 1-2, 3-7, 8+ nights
  roomType?: string;
  nationality?: string;
  isVerifiedStay?: boolean;
  hasOwnerResponse?: boolean;
  hasSubRatings?: boolean;
  minCleanlinessRating?: number;
  minComfortRating?: number;
  minLocationRating?: number;
  minFacilitiesRating?: number;
  minStaffRating?: number;
  minValueForMoneyRating?: number;
  minWifiRating?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  hasLikedMost?: boolean;
  hasDislikedMost?: boolean;
  search?: string;
  sortBy?:
    | 'publishedDate'
    | 'stayDate'
    | 'rating'
    | 'lengthOfStay'
    | 'guestType'
    | 'responseStatus';
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean;
  isImportant?: boolean;
  dateRange?: 'today' | 'week' | 'month' | '3months' | '6months' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
}

const useBookingReviews = (slug?: string, filters: UseBookingReviewsFilters = {}) => {
  const { query, isReady } = useRouter();
  const rawTeamSlug = slug || (isReady ? query.slug : null);
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.page) params.set('page', filters.page.toString());
    if (filters.limit) params.set('limit', filters.limit.toString());
    if (filters.rating) params.set('rating', filters.rating.toString());
    if (filters.ratings && filters.ratings.length > 0) {
      params.set('ratings', filters.ratings.join(','));
    }
    if (filters.guestType) params.set('guestType', filters.guestType);
    if (filters.lengthOfStay) params.set('lengthOfStay', filters.lengthOfStay);
    if (filters.roomType) params.set('roomType', filters.roomType);
    if (filters.nationality) params.set('nationality', filters.nationality);
    if (filters.isVerifiedStay !== undefined)
      params.set('isVerifiedStay', filters.isVerifiedStay.toString());
    if (filters.hasOwnerResponse !== undefined)
      params.set('hasOwnerResponse', filters.hasOwnerResponse.toString());
    if (filters.hasSubRatings !== undefined)
      params.set('hasSubRatings', filters.hasSubRatings.toString());
    if (filters.minCleanlinessRating)
      params.set('minCleanlinessRating', filters.minCleanlinessRating.toString());
    if (filters.minComfortRating)
      params.set('minComfortRating', filters.minComfortRating.toString());
    if (filters.minLocationRating)
      params.set('minLocationRating', filters.minLocationRating.toString());
    if (filters.minFacilitiesRating)
      params.set('minFacilitiesRating', filters.minFacilitiesRating.toString());
    if (filters.minStaffRating) params.set('minStaffRating', filters.minStaffRating.toString());
    if (filters.minValueForMoneyRating)
      params.set('minValueForMoneyRating', filters.minValueForMoneyRating.toString());
    if (filters.minWifiRating) params.set('minWifiRating', filters.minWifiRating.toString());
    if (filters.sentiment) params.set('sentiment', filters.sentiment);
    if (filters.hasLikedMost !== undefined)
      params.set('hasLikedMost', filters.hasLikedMost.toString());
    if (filters.hasDislikedMost !== undefined)
      params.set('hasDislikedMost', filters.hasDislikedMost.toString());
    if (filters.search) params.set('search', filters.search);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.isRead !== undefined) params.set('isRead', filters.isRead.toString());
    if (filters.isImportant !== undefined)
      params.set('isImportant', filters.isImportant.toString());
    if (filters.dateRange) params.set('dateRange', filters.dateRange);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);

    return params.toString();
  }, [filters]);

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<BookingReviewsResponse>>(
    teamSlug ? `/api/teams/${teamSlug}/booking/reviews?${queryParams}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // 30 seconds
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  const refreshReviews = async () => {
    await mutate();
  };

  return {
    reviews: data?.data?.reviews || [],
    pagination: data?.data?.pagination || {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    stats: data?.data?.stats || {
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
    },
    isLoading,
    isError: error,
    refreshReviews,
    mutate,
  };
};

export default useBookingReviews;
