import type {
  GoogleReviewWithMetadata,
  FacebookReviewWithMetadata,
  TripAdvisorReviewWithMetadata,
  BookingReviewWithMetadata,
} from "../../types/extended-types";

/**
 * Review repository interface
 * Segregated interface for review operations (ISP)
 */
export interface IReviewRepository<T> {
  findByBusinessId(businessId: string): Promise<T[]>;
  findByBusinessIdWithMetadata(businessId: string): Promise<T[]>;
  create(review: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
  createMany(
    reviews: Omit<T, "id" | "createdAt" | "updatedAt">[],
  ): Promise<T[]>;
  update(id: string, review: Partial<T>): Promise<T>;
  deleteByBusinessId(businessId: string): Promise<void>;
  countByBusinessId(businessId: string): Promise<number>;
}

export type GoogleReviewRepository =
  IReviewRepository<GoogleReviewWithMetadata>;
export type FacebookReviewRepository =
  IReviewRepository<FacebookReviewWithMetadata>;
export type TripAdvisorReviewRepository =
  IReviewRepository<TripAdvisorReviewWithMetadata>;
export type BookingReviewRepository =
  IReviewRepository<BookingReviewWithMetadata>;
