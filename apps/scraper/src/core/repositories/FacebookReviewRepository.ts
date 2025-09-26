import { prisma } from '@wirecrest/db';
import { FacebookReview } from '@prisma/client';
import { FacebookReviewWithMetadata } from '../../types/extended-types';
import { BaseRepository } from './BaseRepository';
import { IReviewRepository } from '../interfaces/IReviewRepository';

/**
 * Facebook Review Repository
 * Follows Single Responsibility Principle (SRP) - only handles Facebook review data
 */
export class FacebookReviewRepository extends BaseRepository<FacebookReview, string> implements IReviewRepository<FacebookReviewWithMetadata> {
  protected model = prisma.facebookReview;

  async findByBusinessId(businessId: string): Promise<FacebookReviewWithMetadata[]> {
    return await this.model.findMany({
      where: { businessProfileId: businessId }
    }) as FacebookReviewWithMetadata[];
  }

  async findByBusinessIdWithMetadata(businessId: string): Promise<FacebookReviewWithMetadata[]> {
    return await this.model.findMany({
      where: { businessProfileId: businessId },
      include: {
        reviewMetadata: true
      }
    }) as FacebookReviewWithMetadata[];
  }

  async create(review: Omit<FacebookReviewWithMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<FacebookReviewWithMetadata> {
    const { reviewMetadata, ...reviewData } = review;
    return await this.model.create({
      data: reviewData,
      include: {
        reviewMetadata: true
      }
    }) as FacebookReviewWithMetadata;
  }

  async createMany(reviews: Omit<FacebookReviewWithMetadata, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<FacebookReviewWithMetadata[]> {
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

  async update(id: string, review: Partial<FacebookReviewWithMetadata>): Promise<FacebookReviewWithMetadata> {
    const { reviewMetadata, ...reviewData } = review;
    return await this.model.update({
      where: { id },
      data: reviewData,
      include: {
        reviewMetadata: true
      }
    }) as FacebookReviewWithMetadata;
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
