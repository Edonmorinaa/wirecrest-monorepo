import { prisma } from '@wirecrest/db';
import { BookingReview } from '@prisma/client';
import { BookingReviewWithMetadata } from '../../types/extended-types';
import { BaseRepository } from './BaseRepository';
import { IReviewRepository } from '../interfaces/IReviewRepository';

/**
 * Booking Review Repository
 * Follows Single Responsibility Principle (SRP) - only handles Booking review data
 */
export class BookingReviewRepository extends BaseRepository<BookingReview, string> implements IReviewRepository<BookingReviewWithMetadata> {
  protected model = prisma.bookingReview;

  async findByBusinessId(businessId: string): Promise<BookingReviewWithMetadata[]> {
    return await this.model.findMany({
      where: { businessProfileId: businessId }
    }) as BookingReviewWithMetadata[];
  }

  async findByBusinessIdWithMetadata(businessId: string): Promise<BookingReviewWithMetadata[]> {
    return await this.model.findMany({
      where: { businessProfileId: businessId },
      include: {
        reviewMetadata: true
      }
    }) as BookingReviewWithMetadata[];
  }

  async create(review: Omit<BookingReviewWithMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<BookingReviewWithMetadata> {
    const { reviewMetadata, ...reviewData } = review;
    return await this.model.create({
      data: reviewData,
      include: {
        reviewMetadata: true
      }
    }) as BookingReviewWithMetadata;
  }

  async createMany(reviews: Omit<BookingReviewWithMetadata, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<BookingReviewWithMetadata[]> {
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

  async update(id: string, review: Partial<BookingReviewWithMetadata>): Promise<BookingReviewWithMetadata> {
    const { reviewMetadata, ...reviewData } = review;
    return await this.model.update({
      where: { id },
      data: reviewData,
      include: {
        reviewMetadata: true
      }
    }) as BookingReviewWithMetadata;
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
