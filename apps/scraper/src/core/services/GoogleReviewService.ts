import type { GoogleReviewWithMetadata } from '../../types/extended-types';
import type { IReviewService, ReviewResult } from '../interfaces/IReviewService';
import type { IReviewRepository } from '../interfaces/IReviewRepository';
import { randomUUID } from 'crypto';

/**
 * Google Review Service
 * Follows Single Responsibility Principle (SRP) - only handles Google review operations
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
export class GoogleReviewService implements IReviewService<GoogleReviewWithMetadata> {
  constructor(
    private reviewRepository: IReviewRepository<GoogleReviewWithMetadata>
  ) {}

  async saveReviews(businessId: string, reviews: GoogleReviewWithMetadata[]): Promise<ReviewResult> {
    try {
      // Delete existing reviews
      await this.reviewRepository.deleteByBusinessId(businessId);

      // Create review metadata for each review
      const reviewsWithMetadata = reviews.map(review => ({
        ...review,
        reviewMetadataId: randomUUID(),
        businessProfileId: businessId
      }));

      // Save reviews
      await this.reviewRepository.createMany(reviewsWithMetadata);

      return {
        success: true,
        reviewsCount: reviews.length,
        message: `Successfully saved ${reviews.length} reviews`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getReviews(businessId: string): Promise<GoogleReviewWithMetadata[]> {
    return await this.reviewRepository.findByBusinessId(businessId);
  }

  async getReviewsWithMetadata(businessId: string): Promise<GoogleReviewWithMetadata[]> {
    return await this.reviewRepository.findByBusinessIdWithMetadata(businessId);
  }

  async deleteReviews(businessId: string): Promise<void> {
    await this.reviewRepository.deleteByBusinessId(businessId);
  }

  async getReviewCount(businessId: string): Promise<number> {
    return await this.reviewRepository.countByBusinessId(businessId);
  }
}
