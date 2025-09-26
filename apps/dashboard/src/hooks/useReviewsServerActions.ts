import { useTransition } from 'react';
import {
  getGoogleReviews,
  getFacebookReviews,
  getTripAdvisorReviews,
  updateGoogleReviewMetadata,
  updateReviewStatus,
} from 'src/actions/reviews';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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

export function useReviewsServerActions(teamSlug: string) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const fetchGoogleReviews = (filters: ReviewFilters = {}) => {
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await getGoogleReviews(teamSlug, filters);
          resolve(result);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to fetch Google reviews');
          reject(error);
        }
      });
    });
  };

  const fetchFacebookReviews = (filters: ReviewFilters = {}) => {
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await getFacebookReviews(teamSlug, filters);
          resolve(result);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to fetch Facebook reviews');
          reject(error);
        }
      });
    });
  };

  const fetchTripAdvisorReviews = (filters: ReviewFilters = {}) => {
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await getTripAdvisorReviews(teamSlug, filters);
          resolve(result);
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Failed to fetch TripAdvisor reviews'
          );
          reject(error);
        }
      });
    });
  };

  const updateGoogleReview = (
    reviewId: string,
    data: { isRead?: boolean; isImportant?: boolean }
  ) => {
    startTransition(async () => {
      try {
        await updateGoogleReviewMetadata(teamSlug, reviewId, data);
        toast.success('Review updated successfully');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update review');
      }
    });
  };

  const updateReview = (reviewId: string, field: string, value: any) => {
    startTransition(async () => {
      try {
        await updateReviewStatus(teamSlug, reviewId, field, value);
        toast.success('Review updated successfully');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update review');
      }
    });
  };

  return {
    fetchGoogleReviews,
    fetchFacebookReviews,
    fetchTripAdvisorReviews,
    updateGoogleReview,
    updateReview,
    isPending,
  };
}
