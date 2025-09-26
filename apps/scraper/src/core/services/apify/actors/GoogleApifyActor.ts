import { ApifyClient } from 'apify-client';
import { MarketPlatform } from '@prisma/client';
import { IApifyActor, IApifyJobResult } from '../../../interfaces/IApifyService';
import { logger } from '../../../../utils/logger';

/**
 * Google Maps Apify Actor Implementation
 * Follows Single Responsibility Principle (SRP) - only handles Google Maps data extraction
 * Follows Open/Closed Principle (OCP) - can be extended without modification
 */
export class GoogleApifyActor implements IApifyActor {
  public readonly actorId: string;
  public readonly platform = MarketPlatform.GOOGLE_MAPS;
  public readonly memoryEstimateMB: number;

  private apifyClient: ApifyClient;

  constructor(apifyToken: string, actorId?: string) {
    this.actorId = actorId || process.env.APIFY_GOOGLE_REVIEWS_ACTOR_ID || 'google-maps-reviews-scraper';
    this.memoryEstimateMB = 512; // 512MB for Google Maps scraping
    this.apifyClient = new ApifyClient({ token: apifyToken });
  }

  async execute(input: any): Promise<IApifyJobResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`[GoogleApifyActor] Starting execution with input:`, input);
      
      // Validate input before execution
      if (!this.validateInput(input)) {
        throw new Error('Invalid input for Google Maps actor');
      }

      // Execute the Apify actor
      const run = await this.apifyClient.actor(this.actorId).call(input);
      
      if (!run || !run.defaultDatasetId) {
        throw new Error('Apify actor run failed or did not produce a dataset');
      }

      // Get the results from the dataset
      const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`[GoogleApifyActor] Execution completed. Processed ${items.length} items in ${processingTime}ms`);
      
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
      
      logger.error(`[GoogleApifyActor] Execution failed:`, error);
      
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

    // Required fields for Google Maps
    if (!input.placeIds || !Array.isArray(input.placeIds) || input.placeIds.length === 0) {
      return false;
    }

    // Validate placeId format (Google Place ID format)
    for (const placeId of input.placeIds) {
      if (typeof placeId !== 'string' || placeId.length < 10) {
        return false;
      }
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
    const maxReviews = input.maxReviews || 100;
    const baseMemory = this.memoryEstimateMB;
    const additionalMemory = Math.ceil(maxReviews / 100) * 50; // 50MB per 100 reviews
    
    return Math.min(baseMemory + additionalMemory, 2048); // Cap at 2GB
  }
}
