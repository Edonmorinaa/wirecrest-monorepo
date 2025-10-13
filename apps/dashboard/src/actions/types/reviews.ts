import type {
  GoogleReview,
  BookingReview,
  FacebookReview,
  ReviewMetadata,
  TripAdvisorReview,
} from '@prisma/client';

// Google Review Types
export interface GoogleReviewWithMetadata extends GoogleReview {
  reviewMetadata?: ReviewMetadata | null;
}

export interface GoogleReviewsResponse {
  reviews: GoogleReviewWithMetadata[];
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
    withResponse: number;
    unread: number;
  };
}

// Facebook Review Types
export interface FacebookReviewWithMetadata extends FacebookReview {
  reviewMetadata?: ReviewMetadata | null;
  photos?: any[];
  comments?: any[];
}

export interface FacebookReviewsResponse {
  reviews: FacebookReviewWithMetadata[];
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
    recommendationRate: number;
    recommendedCount: number;
    notRecommendedCount: number;
    totalLikes: number;
    totalComments: number;
    totalPhotos: number;
    averageEngagement: number;
    sentimentScore: number;
    qualityScore: number;
    unread: number;
    withPhotos: number;
    withTags: number;
  };
}

// TripAdvisor Review Types
export interface TripAdvisorReviewWithMetadata extends TripAdvisorReview {
  reviewMetadata?: ReviewMetadata | null;
  photos?: any[];
  subRatings?: any;
  reviewerBadges?: any[];
}

export interface TripAdvisorReviewsResponse {
  reviews: TripAdvisorReviewWithMetadata[];
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
    ratingDistribution: {
      oneStar: number;
      twoStar: number;
      threeStar: number;
      fourStar: number;
      fiveStar: number;
    };
    tripTypeDistribution: {
      family: number;
      couples: number;
      solo: number;
      business: number;
      friends: number;
    };
    totalHelpfulVotes: number;
    totalPhotos: number;
    averageHelpfulVotes: number;
    sentimentScore: number;
    qualityScore: number;
    unread: number;
    withPhotos: number;
    withOwnerResponse: number;
    responseRate: number;
  };
}

// Booking.com Review Types
export interface BookingReviewWithMetadata extends BookingReview {
  reviewMetadata?: ReviewMetadata | null;
}

export interface BookingReviewsResponse {
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
