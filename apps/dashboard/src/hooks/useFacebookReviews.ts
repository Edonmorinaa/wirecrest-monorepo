'use client';

import { useParams } from 'next/navigation';

import { trpc } from 'src/lib/trpc/client';

interface FacebookReviewFilters {
  page?: number;
  limit?: number;
  isRecommended?: boolean;
  hasLikes?: boolean;
  hasComments?: boolean;
  hasPhotos?: boolean;
  hasTags?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  isRead?: boolean;
  isImportant?: boolean;
  minLikes?: number;
  maxLikes?: number;
  minComments?: number;
  maxComments?: number;
}

/**
 * Hook for fetching Facebook reviews using tRPC
 * Replaces manual state management with React Query (via tRPC)
 */
export function useFacebookReviews(slug?: string, filters: FacebookReviewFilters = {}) {
  const params = useParams();
  
  // Use tRPC query instead of manual state management
  const { data, error, isLoading, refetch } = trpc.reviews.facebook.useQuery(
    {
      teamSlug: slug!,
      page: filters.page || 1,
      limit: filters.limit || 10,
      sortBy: filters.sortBy || 'date',
      sortOrder: filters.sortOrder || 'desc',
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      isRead: filters.isRead || undefined,
      isImportant: filters.isImportant || undefined,
      sentiment: filters.sentiment || undefined,
      search: filters.search || undefined,
      hasLikes: filters.hasLikes || undefined,
      hasComments: filters.hasComments || undefined,
      hasPhotos: filters.hasPhotos || undefined,
      hasTags: filters.hasTags || undefined,
    },
    {
      enabled: !!slug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000, // 30 seconds
      keepPreviousData: true,
      retry: 3,
      retryDelay: 5000,
      suspense: true,
    }
  );

  return {
    reviews: data?.reviews || [],
    stats: data?.stats || {
      total: 0,
      recommendationRate: 0,
      recommendedCount: 0,
      notRecommendedCount: 0,
      totalLikes: 0,
      totalComments: 0,
      totalPhotos: 0,
      averageEngagement: 0,
      sentimentScore: 0,
      qualityScore: 0,
      unread: 0,
      withPhotos: 0,
      withTags: 0,
    },
    pagination: data?.pagination || {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    isLoading,
    error: error?.message || null,
    refetch,
  };
}
