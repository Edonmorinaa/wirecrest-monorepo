import { useMemo } from 'react';

import {
  useBookingReviews,
  useFacebookReviews,
  useGoogleReviews,
  useTripAdvisorReviews,
  useUpdateBookingReviewMetadata,
  useUpdateFacebookReviewMetadata,
  useUpdateGoogleReviewMetadata,
  useUpdateTripAdvisorReviewMetadata,
} from './useLocations';

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
 * Helper function to normalize dates from different platforms
 * Returns ISO string format or a valid fallback
 */
const normalizeDate = (date: string | Date | null | undefined): string => {
  if (!date) return new Date().toISOString();
  
  try {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return new Date().toISOString();
    }
    return parsedDate.toISOString();
  } catch (error) {
    console.error('Error normalizing date:', date, error);
    return new Date().toISOString();
  }
};

/**
 * Hook for fetching unified inbox reviews from all platforms using tRPC locations router
 * Combines reviews from Google, Facebook, TripAdvisor, and Booking into a unified view
 */
const useInboxReviews = (locationId?: string, filters: InboxFilters = {}) => {
  // Determine which platforms to fetch based on filters
  const shouldFetchGoogle = !filters.platforms || filters.platforms.includes('google');
  const shouldFetchFacebook = !filters.platforms || filters.platforms.includes('facebook');
  const shouldFetchTripAdvisor = !filters.platforms || filters.platforms.includes('tripadvisor');
  const shouldFetchBooking = !filters.platforms || filters.platforms.includes('booking');

  // Calculate how many reviews to fetch based on current page
  // We need to fetch enough reviews from each platform to support pagination
  // If user is on page 6 with 20 per page, we need at least 120 reviews
  // Add buffer for next pages (fetch 50 extra)
  const currentPage = filters.page || 1;
  const currentLimit = filters.limit || 20;
  const reviewsNeeded = currentPage * currentLimit;
  const fetchLimit = Math.min(Math.ceil(reviewsNeeded / 4) + 50, 1000); // Divide by 4 platforms, add buffer, cap at 1000
  
  // Fetch reviews from all platforms with dynamic limit
  const googleReviews = useGoogleReviews(
    locationId || '',
    {
      rating: filters.ratings,
      search: filters.search,
      isRead: filters.status === 'read' ? true : filters.status === 'unread' ? false : undefined,
      isImportant: filters.status === 'important' ? true : undefined,
      hasResponse: filters.status === 'replied' ? true : filters.status === 'not-replied' ? false : undefined,
      sentiment: filters.sentiment,
    },
    { page: 1, limit: fetchLimit },
    shouldFetchGoogle && !!locationId
  );

  const facebookReviews = useFacebookReviews(
    locationId || '',
    {
      rating: filters.ratings,
      search: filters.search,
      isRead: filters.status === 'read' ? true : filters.status === 'unread' ? false : undefined,
      isImportant: filters.status === 'important' ? true : undefined,
      hasResponse: filters.status === 'replied' ? true : filters.status === 'not-replied' ? false : undefined,
      sentiment: filters.sentiment,
    },
    { page: 1, limit: fetchLimit },
    shouldFetchFacebook && !!locationId
  );

  const tripadvisorReviews = useTripAdvisorReviews(
    locationId || '',
    {
      rating: filters.ratings,
      search: filters.search,
      isRead: filters.status === 'read' ? true : filters.status === 'unread' ? false : undefined,
      isImportant: filters.status === 'important' ? true : undefined,
      hasResponse: filters.status === 'replied' ? true : filters.status === 'not-replied' ? false : undefined,
      sentiment: filters.sentiment,
    },
    { page: 1, limit: fetchLimit },
    shouldFetchTripAdvisor && !!locationId
  );

  const bookingReviews = useBookingReviews(
    locationId || '',
    {
      rating: filters.ratings,
      search: filters.search,
      isRead: filters.status === 'read' ? true : filters.status === 'unread' ? false : undefined,
      isImportant: filters.status === 'important' ? true : undefined,
      hasResponse: filters.status === 'replied' ? true : filters.status === 'not-replied' ? false : undefined,
      sentiment: filters.sentiment,
    },
    { page: 1, limit: fetchLimit },
    shouldFetchBooking && !!locationId
  );

  // Get mutation hooks for updating review metadata
  const updateGoogleMutation = useUpdateGoogleReviewMetadata();
  const updateFacebookMutation = useUpdateFacebookReviewMetadata();
  const updateTripAdvisorMutation = useUpdateTripAdvisorReviewMetadata();
  const updateBookingMutation = useUpdateBookingReviewMetadata();

  // Combine and transform reviews from all platforms
  const unifiedReviews = useMemo<UnifiedReview[]>(() => {
    const combined: UnifiedReview[] = [];

    // Transform Google reviews
    if (shouldFetchGoogle && googleReviews.reviews) {
      googleReviews.reviews.forEach((review: any) => {
        combined.push({
          id: review.id,
          platform: 'google',
          author: review.name || 'Anonymous',
          authorImage: review.reviewerPhotoUrl,
          rating: review.stars,
          text: review.text,
          date: normalizeDate(review.publishedAtDate),
          images: review.reviewImageUrls || [],
          replyText: review.responseFromOwnerText,
          replyDate: review.responseFromOwnerDate ? normalizeDate(review.responseFromOwnerDate) : undefined,
          hasReply: !!review.responseFromOwnerText,
          sentiment: review.reviewMetadata?.sentiment,
          keywords: review.reviewMetadata?.keywords || [],
          isRead: review.reviewMetadata?.isRead ?? false,
          isImportant: review.reviewMetadata?.isImportant ?? false,
          sourceUrl: review.reviewUrl,
          generatedReply: review.reviewMetadata?.generatedReply,
        });
      });
    }

    // Transform Facebook reviews
    if (shouldFetchFacebook && facebookReviews.reviews) {
      facebookReviews.reviews.forEach((review: any) => {
        // Extract photos URLs if photos relation exists
        const photoUrls = review.photos?.map((photo: any) => photo.url || photo.imageUri) || [];
        
        // Check for owner response in comments
        const ownerComment = review.comments?.find((c: any) => c.commenterName?.toLowerCase().includes('owner') || c.commenterName?.toLowerCase().includes('response'));
        
        combined.push({
          id: review.id,
          platform: 'facebook',
          author: review.userName || 'Anonymous',
          authorImage: review.userProfilePic,
          rating: review.isRecommended ? 5 : 1,
          text: review.text,
          date: normalizeDate(review.date),
          images: photoUrls,
          replyText: ownerComment?.text || review.responseFromOwner,
          replyDate: ownerComment?.date ? normalizeDate(ownerComment.date) : undefined,
          hasReply: !!ownerComment || !!review.responseFromOwner,
          sentiment: review.reviewMetadata?.sentiment,
          keywords: review.reviewMetadata?.keywords || [],
          isRead: review.reviewMetadata?.isRead ?? false,
          isImportant: review.reviewMetadata?.isImportant ?? false,
          sourceUrl: review.url,
          generatedReply: review.reviewMetadata?.generatedReply,
        });
      });
    }

    // Transform TripAdvisor reviews
    if (shouldFetchTripAdvisor && tripadvisorReviews.reviews) {
      tripadvisorReviews.reviews.forEach((review: any) => {
        combined.push({
          id: review.id,
          platform: 'tripadvisor',
          author: review.username || 'Anonymous',
          authorImage: review.userProfile?.avatar,
          rating: review.rating,
          text: review.text,
          date: normalizeDate(review.publishedDate),
          images: review.photos?.map((p: any) => p.url) || [],
          replyText: review.ownerResponse?.text,
          replyDate: normalizeDate(review.ownerResponse?.publishedDate),
          hasReply: !!review.ownerResponse,
          sentiment: review.sentiment,
          keywords: review.keywords,
          isRead: review.isRead ?? false,
          isImportant: review.isImportant ?? false,
          sourceUrl: review.url,
          generatedReply: review.generatedReply,
        });
      });
    }

    // Transform Booking reviews
    if (shouldFetchBooking && bookingReviews.reviews) {
      bookingReviews.reviews.forEach((review: any) => {
        combined.push({
          id: review.id,
          platform: 'booking',
          author: review.guestName || 'Anonymous',
          authorImage: review.guestAvatar,
          rating: review.averageScore || 0,
          text: `${review.pros || ''}\n${review.cons || ''}`.trim(),
          date: normalizeDate(review.stayDate || review.reviewDate),
          images: [],
          replyText: review.propertyResponse?.text,
          replyDate: normalizeDate(review.propertyResponse?.date),
          hasReply: !!review.propertyResponse,
          sentiment: review.sentiment,
          keywords: review.keywords,
          isRead: review.isRead ?? false,
          isImportant: review.isImportant ?? false,
          sourceUrl: review.url,
          generatedReply: review.generatedReply,
        });
      });
    }

    // Sort by date (most recent first) unless custom sort is specified
    if (filters.sortBy === 'rating') {
      combined.sort((a, b) => filters.sortOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating);
    } else if (filters.sortBy === 'sentiment') {
      combined.sort((a, b) => {
        const sentA = a.sentiment || 0;
        const sentB = b.sentiment || 0;
        return filters.sortOrder === 'asc' ? sentA - sentB : sentB - sentA;
      });
    } else if (filters.sortBy === 'platform') {
      combined.sort((a, b) => filters.sortOrder === 'asc' ? a.platform.localeCompare(b.platform) : b.platform.localeCompare(a.platform));
    } else {
      // Default: sort by date
      combined.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return filters.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return combined;
  }, [
    googleReviews.reviews,
    facebookReviews.reviews,
    tripadvisorReviews.reviews,
    bookingReviews.reviews,
    shouldFetchGoogle,
    shouldFetchFacebook,
    shouldFetchTripAdvisor,
    shouldFetchBooking,
    filters.sortBy,
    filters.sortOrder,
  ]);

  // Calculate unified statistics using backend stats (true totals)
  const stats = useMemo(() => {
    const googleStats = googleReviews.allTimeStats;
    const facebookStats = facebookReviews.allTimeStats;
    const tripadvisorStats = tripadvisorReviews.allTimeStats;
    const bookingStats = bookingReviews.allTimeStats;

    // Use backend stats for accurate totals across ALL reviews
    const total = (googleStats?.totalReviews || 0) + (facebookStats?.totalReviews || 0) + (tripadvisorStats?.totalReviews || 0) + (bookingStats?.totalReviews || 0);
    const unread = (googleStats?.unread || 0) + (facebookStats?.unread || 0) + (tripadvisorStats?.unread || 0) + (bookingStats?.unread || 0);
    const withReply = (googleStats?.withResponse || 0) + (facebookStats?.withResponse || 0) + (tripadvisorStats?.withResponse || 0) + (bookingStats?.withResponse || 0);
    
    // Important count from fetched reviews (backend doesn't track this in allTimeStats)
    const important = unifiedReviews.filter(r => r.isImportant).length;

    // Calculate average rating from all platforms
    // Facebook uses recommendation rate, so we approximate: positive = 5, negative = 1
    const facebookAvgRating = (facebookStats?.recommendationRate || 0) * 5 + (1 - (facebookStats?.recommendationRate || 0)) * 1;
    const totalRatings = (googleStats?.totalReviews || 0) * (googleStats?.averageRating || 0) +
      (facebookStats?.totalReviews || 0) * facebookAvgRating +
      (tripadvisorStats?.totalReviews || 0) * (tripadvisorStats?.averageRating || 0) +
      (bookingStats?.totalReviews || 0) * (bookingStats?.averageRating || 0);
    const averageRating = total > 0 ? totalRatings / total : 0;

    return {
      total,
      unread,
      important,
      withReply,
      averageRating,
      platformBreakdown: {
        google: googleStats?.totalReviews || 0,
        facebook: facebookStats?.totalReviews || 0,
        tripadvisor: tripadvisorStats?.totalReviews || 0,
        booking: bookingStats?.totalReviews || 0,
      },
    };
  }, [googleReviews.allTimeStats, facebookReviews.allTimeStats, tripadvisorReviews.allTimeStats, bookingReviews.allTimeStats, unifiedReviews]);

  // Calculate pagination based on unified reviews
  const pagination = useMemo(() => {
    const currentPage = filters.page || 1;
    const currentLimit = filters.limit || 20;
    
    // Use the actual total from stats (all reviews across all platforms)
    const totalReviews = stats.total;
    const totalPages = Math.ceil(totalReviews / currentLimit);
    
    // Paginate the fetched reviews (we fetched 100 per platform = 400 total)
    const startIndex = (currentPage - 1) * currentLimit;
    const endIndex = startIndex + currentLimit;
    const paginatedReviews = unifiedReviews.slice(startIndex, endIndex);
    
    // We can only show pages for reviews we've actually fetched
    const maxPageBasedOnFetched = Math.ceil(unifiedReviews.length / currentLimit);
    const effectiveHasNextPage = currentPage < Math.min(totalPages, maxPageBasedOnFetched);

    return {
      page: currentPage,
      limit: currentLimit,
      total: totalReviews, // True total from backend
      totalPages, // Total pages if we had all reviews
      hasNextPage: effectiveHasNextPage,
      hasPreviousPage: currentPage > 1,
      reviews: paginatedReviews,
      fetchedCount: unifiedReviews.length, // For debugging - how many we actually have
    };
  }, [unifiedReviews, filters.page, filters.limit, stats.total]);

  // Check if any platform is loading
  const isLoading = googleReviews.isLoading || facebookReviews.isLoading || tripadvisorReviews.isLoading || bookingReviews.isLoading;
  const isError = !!googleReviews.error || !!facebookReviews.error || !!tripadvisorReviews.error || !!bookingReviews.error;

  // Function to update review status
  const updateReviewStatus = async (
    reviewId: string,
    platform: 'google' | 'facebook' | 'tripadvisor' | 'booking',
    field: 'isRead' | 'isImportant',
    value: boolean
  ) => {
    if (!locationId) return;

    try {
      switch (platform) {
        case 'google':
          await updateGoogleMutation.mutateAsync({
            locationId,
            platform: 'google',
            reviewId,
            metadata: { [field]: value },
          });
          break;
        case 'facebook':
          await updateFacebookMutation.mutateAsync({
            locationId,
            platform: 'facebook',
            reviewId,
            metadata: { [field]: value },
          });
          break;
        case 'tripadvisor':
          await updateTripAdvisorMutation.mutateAsync({
            locationId,
            platform: 'tripadvisor',
            reviewId,
            metadata: { [field]: value },
          });
          break;
        case 'booking':
          await updateBookingMutation.mutateAsync({
            locationId,
            platform: 'booking',
            reviewId,
            metadata: { [field]: value },
          });
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      console.error('Error updating review status:', error);
      throw error;
    }
  };

  // Function to refresh all reviews
  const refreshReviews = async () => {
    await Promise.all([
      shouldFetchGoogle && googleReviews.refetch(),
      shouldFetchFacebook && facebookReviews.refetch(),
      shouldFetchTripAdvisor && tripadvisorReviews.refetch(),
      shouldFetchBooking && bookingReviews.refetch(),
    ].filter(Boolean));
  };

  return {
    data: { reviews: pagination.reviews, pagination, stats },
    reviews: pagination.reviews,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNextPage: pagination.hasNextPage,
      hasPreviousPage: pagination.hasPreviousPage,
    },
    stats,
    isLoading,
    isError,
    error: isError ? 'Error loading reviews from one or more platforms' : null,
    refreshReviews,
    updateReviewStatus,
  };
};

export default useInboxReviews;
