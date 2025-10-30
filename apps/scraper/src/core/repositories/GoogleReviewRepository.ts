import { prisma } from '@wirecrest/db';
import type { GoogleReview } from '@prisma/client';
import type { GoogleReviewWithMetadata } from '../../types/extended-types';
import { BaseRepository } from './BaseRepository';
import type { IReviewRepository } from '../interfaces/IReviewRepository';

/**
 * Google Review Repository
 * Follows Single Responsibility Principle (SRP) - only handles Google review data
 */
export class GoogleReviewRepository extends BaseRepository<GoogleReview, string> implements IReviewRepository<GoogleReviewWithMetadata> {
  protected model = prisma.googleReview;

  async findByBusinessId(businessId: string): Promise<GoogleReviewWithMetadata[]> {
    return await this.model.findMany({
      where: { businessProfileId: businessId }
    }) as GoogleReviewWithMetadata[];
  }

  async findByBusinessIdWithMetadata(businessId: string): Promise<GoogleReviewWithMetadata[]> {
    return await this.model.findMany({
      where: { businessProfileId: businessId },
      include: {
        reviewMetadata: true
      }
    }) as GoogleReviewWithMetadata[];
  }

  async create(review: Omit<GoogleReviewWithMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<GoogleReviewWithMetadata> {
    const { reviewMetadata, ...reviewData } = review;
    return await this.model.create({
      data: reviewData,
      include: {
        reviewMetadata: true
      }
    }) as GoogleReviewWithMetadata;
  }

  async createMany(reviews: Omit<GoogleReviewWithMetadata, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<GoogleReviewWithMetadata[]> {
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

  async update(id: string, review: Partial<GoogleReviewWithMetadata>): Promise<GoogleReviewWithMetadata> {
    const { reviewMetadata, ...reviewData } = review;
    return await this.model.update({
      where: { id },
      data: reviewData,
      include: {
        reviewMetadata: true
      }
    }) as GoogleReviewWithMetadata;
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
