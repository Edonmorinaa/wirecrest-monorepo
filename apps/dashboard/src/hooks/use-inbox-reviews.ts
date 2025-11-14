import { trpc } from 'src/lib/trpc/client';

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

/**
 * Hook for fetching unified inbox reviews using tRPC
 * Replaces manual state management with React Query (via tRPC)
 */
const useInboxReviews = (teamSlug?: string, filters: InboxFilters = {}) => {
  // Use tRPC query to fetch all team reviews (unified)
  const { data, error, isLoading, refetch } = trpc.reviews.getTeamReviews.useQuery(
    {
      slug: teamSlug!,
      filters: {
        page: filters.page,
        limit: filters.limit,
        rating: filters.ratings,
        sentiment: filters.sentiment,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      },
    },
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
    error: error?.message || null,
    refetch,
  };
};

export default useInboxReviews;
