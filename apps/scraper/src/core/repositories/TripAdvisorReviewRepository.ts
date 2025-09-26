import { prisma } from '@wirecrest/db';
import { TripAdvisorReview } from '@prisma/client';
import { TripAdvisorReviewWithMetadata } from '../../types/extended-types';
import { BaseRepository } from './BaseRepository';
import { IReviewRepository } from '../interfaces/IReviewRepository';

/**
 * TripAdvisor Review Repository
 * Follows Single Responsibility Principle (SRP) - only handles TripAdvisor review data
 */
export class TripAdvisorReviewRepository extends BaseRepository<TripAdvisorReview, string> implements IReviewRepository<TripAdvisorReviewWithMetadata> {
  protected model = prisma.tripAdvisorReview;

  async findByBusinessId(businessId: string): Promise<TripAdvisorReviewWithMetadata[]> {
    return await this.model.findMany({
      where: { businessProfileId: businessId }
    }) as TripAdvisorReviewWithMetadata[];
  }

  async findByBusinessIdWithMetadata(businessId: string): Promise<TripAdvisorReviewWithMetadata[]> {
    return await this.model.findMany({
      where: { businessProfileId: businessId },
      include: {
        reviewMetadata: true
      }
    }) as TripAdvisorReviewWithMetadata[];
  }

  async create(review: Omit<TripAdvisorReviewWithMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<TripAdvisorReviewWithMetadata> {
    const { reviewMetadata, ...reviewData } = review;
    return await this.model.create({
      data: reviewData,
      include: {
        reviewMetadata: true
      }
    }) as TripAdvisorReviewWithMetadata;
  }

  async createMany(reviews: Omit<TripAdvisorReviewWithMetadata, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<TripAdvisorReviewWithMetadata[]> {
    const reviewsData = reviews.map(review => {
      const { reviewMetadata, ...reviewData } = review;
      return reviewData;
    });
    
    await this.model.createMany({
      data: reviewsData
    });

    // Return the created reviews with metadata
    return await this.findByBusinessIdWithMetadata(reviews[0]?.businessProfileId || '');
  }

  async update(id: string, review: Partial<TripAdvisorReviewWithMetadata>): Promise<TripAdvisorReviewWithMetadata> {
    const { reviewMetadata, ...reviewData } = review;
    return await this.model.update({
      where: { id },
      data: reviewData,
      include: {
        reviewMetadata: true
      }
    }) as TripAdvisorReviewWithMetadata;
  }

  async deleteByBusinessId(businessId: string): Promise<void> {
    await this.model.deleteMany({
      where: { businessProfileId: businessId }
    });
  }

  async countByBusinessId(businessId: string): Promise<number> {
    return await this.model.count({
      where: { businessProfileId: businessId }
    });
  }
}
