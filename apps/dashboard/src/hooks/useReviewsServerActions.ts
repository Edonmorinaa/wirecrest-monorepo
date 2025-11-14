import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { trpc } from 'src/lib/trpc/client';

interface ReviewFilters {
  page?: number;
  limit?: number;
  rating?: number | number[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isRead?: boolean;
  isImportant?: boolean;
  hasResponse?: boolean;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Hook for review operations using tRPC
 * Provides type-safe review fetching and updates
 */
export function useReviewsServerActions(teamSlug: string) {
  const router = useRouter();
  const utils = trpc.useUtils();

  // tRPC mutations
  const updateGoogleMetadataMutation = trpc.reviews.updateGoogleMetadata.useMutation({
    onSuccess: () => {
      utils.reviews.getGoogleReviews.invalidate({ slug: teamSlug });
      toast.success('Review updated successfully');
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update review');
    },
  });

  const updateStatusMutation = trpc.reviews.updateStatus.useMutation({
    onSuccess: () => {
      utils.reviews.getTeamReviews.invalidate({ slug: teamSlug });
      toast.success('Review updated successfully');
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update review');
    },
  });

  // Helper functions that return promises for compatibility
  const fetchGoogleReviews = async (filters: ReviewFilters = {}) => {
    try {
      return await utils.reviews.getGoogleReviews.fetch({
        slug: teamSlug,
        filters,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch Google reviews');
      throw error;
    }
  };

  const fetchFacebookReviews = async (filters: ReviewFilters = {}) => {
    try {
      return await utils.reviews.getFacebookReviews.fetch({
        slug: teamSlug,
        filters,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch Facebook reviews');
      throw error;
    }
  };

  const fetchTripAdvisorReviews = async (filters: ReviewFilters = {}) => {
    try {
      return await utils.reviews.getTripAdvisorReviews.fetch({
        slug: teamSlug,
        filters,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch TripAdvisor reviews');
      throw error;
    }
  };

  const updateGoogleReview = (
    reviewId: string,
    data: { isRead?: boolean; isImportant?: boolean }
  ) => {
    return updateGoogleMetadataMutation.mutateAsync({
      slug: teamSlug,
      reviewId,
      ...data,
    });
  };

  const updateReview = (reviewId: string, field: string, value: any) => {
    return updateStatusMutation.mutateAsync({
      slug: teamSlug,
      reviewId,
      field,
      value,
    });
  };

  return {
    fetchGoogleReviews,
    fetchFacebookReviews,
    fetchTripAdvisorReviews,
    updateGoogleReview,
    updateReview,
    isPending: updateGoogleMetadataMutation.isPending || updateStatusMutation.isPending,
  };
}
