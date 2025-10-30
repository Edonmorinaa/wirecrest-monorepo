import type { FacebookReviewWithMetadata } from '../../types/extended-types.js';
import type { IReviewService, ReviewResult } from '../interfaces/IReviewService';
import type { IReviewRepository } from '../interfaces/IReviewRepository';
import { randomUUID } from 'crypto';

/**
 * Facebook Review Service
 * Follows Single Responsibility Principle (SRP) - only handles Facebook review operations
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
export class FacebookReviewService implements IReviewService<FacebookReviewWithMetadata> {
  constructor(
    private reviewRepository: IReviewRepository<FacebookReviewWithMetadata>
  ) {}

  async saveReviews(businessId: string, reviews: FacebookReviewWithMetadata[]): Promise<ReviewResult> {
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

  async getReviews(businessId: string): Promise<FacebookReviewWithMetadata[]> {
    return await this.reviewRepository.findByBusinessId(businessId);
  }

  async getReviewsWithMetadata(businessId: string): Promise<FacebookReviewWithMetadata[]> {
    return await this.reviewRepository.findByBusinessIdWithMetadata(businessId);
  }

  async deleteReviews(businessId: string): Promise<void> {
    await this.reviewRepository.deleteByBusinessId(businessId);
  }

  async getReviewCount(businessId: string): Promise<number> {
    return await this.reviewRepository.countByBusinessId(businessId);
  }
}
