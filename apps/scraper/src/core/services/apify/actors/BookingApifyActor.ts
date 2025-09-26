import { ApifyClient } from 'apify-client';
import { MarketPlatform } from '@prisma/client';
import { IApifyActor, IApifyJobResult } from '../../../interfaces/IApifyService';
import { logger } from '../../../../utils/logger';

/**
 * Booking.com Apify Actor Implementation
 * Follows Single Responsibility Principle (SRP) - only handles Booking.com data extraction
 * Follows Open/Closed Principle (OCP) - can be extended without modification
 */
export class BookingApifyActor implements IApifyActor {
  public readonly actorId: string;
  public readonly platform = MarketPlatform.BOOKING;
  public readonly memoryEstimateMB: number;

  private apifyClient: ApifyClient;

  constructor(apifyToken: string, actorId?: string) {
    this.actorId = actorId || process.env.APIFY_BOOKING_REVIEWS_ACTOR_ID || 'booking-reviews-scraper';
    this.memoryEstimateMB = 256; // 256MB for Booking.com scraping
    this.apifyClient = new ApifyClient({ token: apifyToken });
  }

  async execute(input: any): Promise<IApifyJobResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`[BookingApifyActor] Starting execution with input:`, input);
      
      // Validate input before execution
      if (!this.validateInput(input)) {
        throw new Error('Invalid input for Booking.com actor');
      }

      // Execute the Apify actor
      const run = await this.apifyClient.actor(this.actorId).call(input);
      
      if (!run || !run.defaultDatasetId) {
        throw new Error('Apify actor run failed or did not produce a dataset');
      }

      // Get the results from the dataset
      const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`[BookingApifyActor] Execution completed. Processed ${items.length} items in ${processingTime}ms`);
      
      return {
        success: true,
        jobId: input.jobId || 'unknown',
        platform: this.platform,
        reviewsProcessed: items.length,
        data: items,
        processingTimeMs: processingTime
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error(`[BookingApifyActor] Execution failed:`, error);
      
      return {
        success: false,
        jobId: input.jobId || 'unknown',
        platform: this.platform,
        reviewsProcessed: 0,
        error: errorMessage,
        processingTimeMs: processingTime
      };
    }
  }

  validateInput(input: any): boolean {
    if (!input || typeof input !== 'object') {
      return false;
    }

    // Required field for Booking.com
    if (!input.bookingUrl || typeof input.bookingUrl !== 'string') {
      return false;
    }

    // Validate bookingUrl format
    if (!input.bookingUrl.includes('booking.com')) {
      return false;
    }

    // Optional fields validation
    if (input.maxReviews && (typeof input.maxReviews !== 'number' || input.maxReviews < 0)) {
      return false;
    }

    return true;
  }

  getMemoryEstimate(input: any): number {
    if (!this.validateInput(input)) {
      return this.memoryEstimateMB;
    }

    // Calculate memory based on expected number of reviews
    const maxReviews = input.maxReviews || 50;
    const baseMemory = this.memoryEstimateMB;
    const additionalMemory = Math.ceil(maxReviews / 50) * 25; // 25MB per 50 reviews
    
    return Math.min(baseMemory + additionalMemory, 1024); // Cap at 1GB
  }
}
