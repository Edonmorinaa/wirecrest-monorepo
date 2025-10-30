import { ApifyClient } from 'apify-client';
import { MarketPlatform } from '@prisma/client';
import type { IApifyActor, IApifyJobResult } from '../../../interfaces/IApifyService';
import { logger } from '../../../../utils/logger';

/**
 * Facebook Apify Actor Implementation
 * Follows Single Responsibility Principle (SRP) - only handles Facebook data extraction
 * Follows Open/Closed Principle (OCP) - can be extended without modification
 */
export class FacebookApifyActor implements IApifyActor {
  public readonly actorId: string;
  public readonly platform = MarketPlatform.FACEBOOK;
  public readonly memoryEstimateMB: number;

  private apifyClient: ApifyClient;

  constructor(apifyToken: string, actorId?: string) {
    this.actorId = actorId || process.env.APIFY_FACEBOOK_REVIEWS_ACTOR_ID || 'facebook-reviews-scraper';
    this.memoryEstimateMB = 256; // 256MB for Facebook scraping
    this.apifyClient = new ApifyClient({ token: apifyToken });
  }

  async execute(input: any): Promise<IApifyJobResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`[FacebookApifyActor] Starting execution with input:`, input);
      
      // Validate input before execution
      if (!this.validateInput(input)) {
        throw new Error('Invalid input for Facebook actor');
      }

      // Execute the Apify actor
      const run = await this.apifyClient.actor(this.actorId).call(input);
      
      if (!run || !run.defaultDatasetId) {
        throw new Error('Apify actor run failed or did not produce a dataset');
      }

      // Get the results from the dataset
      const { items } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`[FacebookApifyActor] Execution completed. Processed ${items.length} items in ${processingTime}ms`);
      
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
      
      logger.error(`[FacebookApifyActor] Execution failed:`, error);
      
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

    // Required fields for Facebook - either pageId or pageUrl
    if (!input.pageId && !input.pageUrl) {
      return false;
    }

    // Validate pageId format if provided
    if (input.pageId && (typeof input.pageId !== 'string' || input.pageId.length < 3)) {
      return false;
    }

    // Validate pageUrl format if provided
    if (input.pageUrl && (typeof input.pageUrl !== 'string' || !input.pageUrl.includes('facebook.com'))) {
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
