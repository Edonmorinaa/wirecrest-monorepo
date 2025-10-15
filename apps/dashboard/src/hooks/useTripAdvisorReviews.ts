import useSWR from 'swr';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';

import { getTripAdvisorReviews } from 'src/actions/reviews';
import type { TripAdvisorReviewsResponse } from 'src/actions/types/reviews';

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

const useTripAdvisorReviews = (slug?: string, filters: UseTripAdvisorReviewsFilters = {}) => {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const rawTeamSlug = slug || subdomainTeamSlug || params.slug;
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  // Build query parameters
  const queryParams = useMemo(() => {
    const searchParams = new URLSearchParams();

    if (filters.page) searchParams.set('page', filters.page.toString());
    if (filters.limit) searchParams.set('limit', filters.limit.toString());
    if (filters.rating !== undefined) {
      if (Array.isArray(filters.rating)) {
        filters.rating.forEach((r) => searchParams.append('rating', r.toString()));
      } else {
        searchParams.set('rating', filters.rating.toString());
      }
    }
    if (filters.tripType) {
      if (Array.isArray(filters.tripType)) {
        filters.tripType.forEach((t) => searchParams.append('tripType', t));
      } else {
        searchParams.set('tripType', filters.tripType);
      }
    }
    if (filters.hasPhotos !== undefined) searchParams.set('hasPhotos', filters.hasPhotos.toString());
    if (filters.hasOwnerResponse !== undefined)
      searchParams.set('hasOwnerResponse', filters.hasOwnerResponse.toString());
    if (filters.helpfulVotes !== undefined)
      searchParams.set('helpfulVotes', filters.helpfulVotes.toString());
    if (filters.sentiment) searchParams.set('sentiment', filters.sentiment);
    if (filters.search) searchParams.set('search', filters.search);
    if (filters.sortBy) searchParams.set('sortBy', filters.sortBy);
    if (filters.sortOrder) searchParams.set('sortOrder', filters.sortOrder);
    if (filters.isRead !== undefined) searchParams.set('isRead', filters.isRead.toString());
    if (filters.isImportant !== undefined)
      searchParams.set('isImportant', filters.isImportant.toString());
    if (filters.minHelpfulVotes) searchParams.set('minHelpfulVotes', filters.minHelpfulVotes.toString());
    if (filters.maxHelpfulVotes) searchParams.set('maxHelpfulVotes', filters.maxHelpfulVotes.toString());
    if (filters.dateRange) searchParams.set('dateRange', filters.dateRange);
    if (filters.startDate) searchParams.set('startDate', filters.startDate);
    if (filters.endDate) searchParams.set('endDate', filters.endDate);
    if (filters.visitDate) searchParams.set('visitDate', filters.visitDate);

    return searchParams.toString();
  }, [filters]);

  const { data, error, isLoading, mutate } = useSWR<TripAdvisorReviewsResponse | null>(
    teamSlug ? `tripadvisor-reviews-${teamSlug}-${queryParams}` : null,
    () => getTripAdvisorReviews(teamSlug!, filters),
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
      ratingDistribution: {
        oneStar: 0,
        twoStar: 0,
        threeStar: 0,
        fourStar: 0,
        fiveStar: 0,
      },
      tripTypeDistribution: {
        family: 0,
        couples: 0,
        solo: 0,
        business: 0,
        friends: 0,
      },
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
    isError: error,
    refreshReviews,
    mutate,
  };
};

export default useTripAdvisorReviews;
