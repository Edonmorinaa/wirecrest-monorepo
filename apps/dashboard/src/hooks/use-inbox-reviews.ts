import { useState, useEffect, useCallback } from 'react';

export interface UnifiedReview {
  id: string;
  platform: 'google' | 'facebook' | 'tripadvisor' | 'booking';
  author: string;
  authorImage?: string;
  rating: number;
  text?: string;
  date: string;
  images?: string[];
  replyText?: string;
  replyDate?: string;
  hasReply: boolean;
  sentiment?: number;
  keywords?: string[];
  isRead: boolean;
  isImportant: boolean;
  sourceUrl?: string;
  generatedReply?: string;
}

export interface InboxFilters {
  page?: number;
  limit?: number;
  platforms?: string[];
  ratings?: number[];
  status?: 'all' | 'unread' | 'read' | 'important' | 'replied' | 'not-replied';
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: 'date' | 'rating' | 'sentiment' | 'platform';
  sortOrder?: 'asc' | 'desc';
  dateRange?: 'all' | 'today' | 'week' | 'month' | 'year';
}

interface InboxReviewsResponse {
  reviews: UnifiedReview[];
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
    unread: number;
    important: number;
    withReply: number;
    averageRating: number;
    platformBreakdown: {
      google: number;
      facebook: number;
      tripadvisor: number;
      booking: number;
    };
  };
}

const useInboxReviews = (teamSlug?: string, filters: InboxFilters = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [data, setData] = useState<InboxReviewsResponse | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!teamSlug) return;

    setIsLoading(true);
    setIsError(false);

    try {
      const queryParams = new URLSearchParams();

      // Add filter parameters
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.platforms?.length) queryParams.append('platforms', filters.platforms.join(','));
      if (filters.ratings?.length) queryParams.append('ratings', filters.ratings.join(','));
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.sentiment) queryParams.append('sentiment', filters.sentiment);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
      if (filters.dateRange) queryParams.append('dateRange', filters.dateRange);

      const response = await fetch(
        `/api/teams/${teamSlug}/inbox/reviews?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching inbox reviews:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [teamSlug, filters]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const refreshReviews = useCallback(() => {
    fetchReviews();
  }, [fetchReviews]);

  const updateReviewStatus = useCallback(
    async (reviewId: string, platform: string, field: 'isRead' | 'isImportant', value: boolean) => {
      if (!teamSlug) return;

      try {
        const response = await fetch(`/api/teams/${teamSlug}/inbox/reviews/${reviewId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ field, value, platform }),
        });

        if (!response.ok) {
          throw new Error('Failed to update review status');
        }

        // Refresh the data
        await fetchReviews();
      } catch (error) {
        console.error('Error updating review status:', error);
      }
    },
    [teamSlug, fetchReviews]
  );

  return {
    reviews: data?.reviews || [],
    pagination: data?.pagination || {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    stats: data?.stats || {
      total: 0,
      unread: 0,
      important: 0,
      withReply: 0,
      averageRating: 0,
      platformBreakdown: {
        google: 0,
        facebook: 0,
        tripadvisor: 0,
        booking: 0,
      },
    },
    isLoading,
    isError,
    refreshReviews,
    updateReviewStatus,
  };
};

export default useInboxReviews;
