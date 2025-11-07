import type {
  GoogleReview,
  FacebookReview,
  TripAdvisorReview,
  BookingReview,
  ReviewMetadata,
  GoogleBusinessProfile,
  FacebookBusinessProfile,
  TripAdvisorBusinessProfile,
  BookingBusinessProfile,
  GoogleBusinessMetadata,
  FacebookBusinessMetadata,
  TripAdvisorBusinessMetadata,
  BookingBusinessMetadata,
} from "@prisma/client";

// Extended types that include the reviewMetadata relationship
export interface GoogleReviewWithMetadata extends GoogleReview {
  reviewMetadata: ReviewMetadata | null;
}

export interface FacebookReviewWithMetadata extends FacebookReview {
  reviewMetadata: ReviewMetadata | null;
}

export interface TripAdvisorReviewWithMetadata extends TripAdvisorReview {
  reviewMetadata: ReviewMetadata | null;
}

export interface BookingReviewWithMetadata extends BookingReview {
  reviewMetadata: ReviewMetadata | null;
}

// Extended business profile types with metadata
export interface GoogleBusinessProfileWithMetadata
  extends Omit<GoogleBusinessProfile, "metadata"> {
  metadata: GoogleBusinessMetadata | null;
  reviews: GoogleReviewWithMetadata[];
}

export interface FacebookBusinessProfileWithMetadata
  extends Omit<FacebookBusinessProfile, "metadata"> {
  metadata: FacebookBusinessMetadata | null;
  reviews: FacebookReviewWithMetadata[];
}

export interface TripAdvisorBusinessProfileWithMetadata
  extends Omit<TripAdvisorBusinessProfile, "metadata"> {
  metadata: TripAdvisorBusinessMetadata | null;
  reviews: TripAdvisorReviewWithMetadata[];
}

export interface BookingBusinessProfileWithMetadata
  extends Omit<BookingBusinessProfile, "metadata"> {
  metadata: BookingBusinessMetadata | null;
  reviews: BookingReviewWithMetadata[];
}
