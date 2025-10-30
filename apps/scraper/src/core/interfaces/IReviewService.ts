import type { GoogleReviewWithMetadata, FacebookReviewWithMetadata, TripAdvisorReviewWithMetadata, BookingReviewWithMetadata } from '../../types/extended-types';

/**
 * Review service interface
 * Defines contract for review operations (ISP)
 */
export interface IReviewService<T> {
  saveReviews(businessId: string, reviews: T[]): Promise<ReviewResult>;
  getReviews(businessId: string): Promise<T[]>;
  getReviewsWithMetadata(businessId: string): Promise<T[]>;
  deleteReviews(businessId: string): Promise<void>;
  getReviewCount(businessId: string): Promise<number>;
}

export interface ReviewResult {
  success: boolean;
  reviewsCount?: number;
  message?: string;
  error?: string;
}

export type GoogleReviewService = IReviewService<GoogleReviewWithMetadata>;
export type FacebookReviewService = IReviewService<FacebookReviewWithMetadata>;
export type TripAdvisorReviewService = IReviewService<TripAdvisorReviewWithMetadata>;
export type BookingReviewService = IReviewService<BookingReviewWithMetadata>;
