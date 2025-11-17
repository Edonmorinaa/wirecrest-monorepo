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
        platforms: filters.platforms as ('google' | 'facebook' | 'tripadvisor' | 'booking')[] | undefined,
        // Convert empty arrays to undefined to avoid "in []" queries
        rating: filters.ratings && filters.ratings.length > 0 ? filters.ratings : undefined,
        status: filters.status,
        sentiment: filters.sentiment,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        dateRange: filters.dateRange,
      },
    },
    {
      enabled: !!teamSlug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000,
    }
  );

  // Mutation for updating review status
  const updateStatusMutation = trpc.reviews.updateStatus.useMutation();

  const updateReviewStatus = async (
    reviewId: string,
    platform: 'google' | 'facebook' | 'tripadvisor' | 'booking',
    field: 'isRead' | 'isImportant',
    value: boolean
  ) => {
    await updateStatusMutation.mutateAsync({
      teamSlug: teamSlug!,
      reviewId,
      field,
      value,
    });
    // Refetch reviews after update
    await refetch();
  };

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
    isError: !!error,
    error: error?.message || null,
    refreshReviews: refetch,
    updateReviewStatus,
  };
};

export default useInboxReviews;
