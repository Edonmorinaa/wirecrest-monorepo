import { EventEmitter } from 'events';
import { ActorManager } from './actorManager';
import { BusinessMetadataService } from '../supabase/businessMetadataService';
import { DatabaseService } from '../supabase/database';
import { GoogleBusinessReviewsActorJob, GoogleBusinessReviewsActor } from './actors/googleBusinessReviewsActor';
import { MarketPlatform } from '@prisma/client';
import { ReviewActorJobFactory, ActorJob, ReviewActorJobData, Actor } from './actors/actor';
import { GoogleBusinessReviewsBatchJob, GoogleBusinessReviewsBatchActor, GoogleBusinessBatchJobPayload } from './actors/googleBusinessReviewsBatchActor';

export class ReviewPollingService extends EventEmitter {
  private actorManager: ActorManager;
  private metadataService: BusinessMetadataService;
  private database: DatabaseService;
  private isPolling: boolean = false;
  private pollingInterval: number = 5 * 60 * 1000; // 5 minutes
  private batchSize: number = 30; // Max 30 businesses per batch
  private currentBatchOffset: number = 0;

  constructor(
    actorManager: ActorManager,
    connectionString: string,
    pollingIntervalMs: number = 5 * 60 * 1000,
    batchSize: number = 30
  ) {
    super();
    this.actorManager = actorManager;
    this.metadataService = new BusinessMetadataService();
    this.database = new DatabaseService();
    this.pollingInterval = pollingIntervalMs;
    this.batchSize = batchSize;
  }

  start(): void {
    if (this.isPolling) {
      console.log('Polling service is already running');
      return;
    }

    this.isPolling = true;
    console.log(`Starting review polling service with ${this.batchSize} businesses per batch, interval: ${this.pollingInterval}ms`);
    
    // Start immediate poll
    this.poll();
    
    // Set up interval polling
    setInterval(() => {
      if (this.isPolling) {
        this.poll();
      }
    }, this.pollingInterval);
  }

  stop(): void {
    this.isPolling = false;
    console.log('Review polling service stopped');
  }

  private async poll(): Promise<void> {
    if (!this.isPolling) return;

    try {
      this.emit('poll');
      
      // Get total count of businesses needing update
      const totalBusinesses = await this.metadataService.getBusinessesNeedingUpdateCount();
      console.log(`Total businesses needing update: ${totalBusinesses}`);

      if (totalBusinesses === 0) {
        console.log('No businesses need updating at this time');
        this.currentBatchOffset = 0;
        return;
      }

      // Get businesses with team limits for current batch
      const businessesWithLimits = await this.metadataService.getBusinessesWithTeamLimits(
        this.batchSize, 
        this.currentBatchOffset
      );

      if (businessesWithLimits.length === 0) {
        this.currentBatchOffset = 0;
        console.log('Completed polling cycle, resetting to beginning');
        return;
      }

      console.log(`Processing batch ${Math.floor(this.currentBatchOffset / this.batchSize) + 1}: ${businessesWithLimits.length} businesses (offset: ${this.currentBatchOffset})`);

      // 🔥 NEW: Create single batch job instead of individual jobs
      await this.createBatchJob(businessesWithLimits);

      // Move to next batch
      this.currentBatchOffset += this.batchSize;

      if (this.currentBatchOffset >= totalBusinesses) {
        this.currentBatchOffset = 0;
        console.log('Completed full polling cycle, resetting offset');
      }

    } catch (error) {
      this.emit('error', error);
      console.error('Error during polling:', error);
    }
  }

  /**
   * Create a single batch job for all businesses in the current batch
   */
  private async createBatchJob(businessesWithLimits: any[]): Promise<void> {
    try {
      // Prepare businesses for batch processing
      const batchBusinesses = [];
      
      for (const businessData of businessesWithLimits) {
        if (!this.isPolling) break;

        const business = await this.database.getBusinessById(businessData.businessId);
        if (!business?.placeId) {
          console.warn(`Business ${businessData.businessId} has no placeId, skipping`);
          continue;
        }

        batchBusinesses.push({
          teamId: businessData.teamId,
          placeId: business.placeId,
          businessProfileId: business.id,
          maxReviews: Math.min(businessData.maxReviewsPerBusiness || 2000, 100)
        });

        // Update the business metadata to reflect that we've scheduled it
        await this.metadataService.updateNextUpdateTime(businessData.businessId);
      }

      if (batchBusinesses.length === 0) {
        console.log('No valid businesses found for batch processing');
        return;
      }

      console.log(`Creating batch job for ${batchBusinesses.length} businesses`);

      // Create batch job payload
      const batchJobPayload: GoogleBusinessBatchJobPayload = {
        platform: MarketPlatform.GOOGLE_MAPS,
        businesses: batchBusinesses,
        isInitialization: false // This is polling, not initialization
      };

      // Create the batch actor
      const batchActor = new GoogleBusinessReviewsBatchActor();
      batchActor.updateMemoryEstimate(batchBusinesses.length);

      // For ActorJob interface, we need ReviewActorJobData - use first business's teamId as representative
      const reviewActorJobData: ReviewActorJobData = {
        platform: MarketPlatform.GOOGLE_MAPS,
        teamId: batchBusinesses[0].teamId, // Use first business's teamId as representative
        isInitialization: false,
        placeID: `batch-${batchBusinesses.length}-businesses` // Identifier for batch
      };

      // Create the batch job
      const jobId = `google-batch-poll-${Date.now()}`;
      const actorJob = new ActorJob(
        jobId,
        batchActor,
        reviewActorJobData,
        async () => {
          const batchJob = new GoogleBusinessReviewsBatchJob(
            batchJobPayload,
            process.env.APIFY_TOKEN!
          );
          
          await batchJob.run();
          return true;
        }
      );

      // Schedule with 'poll' source for priority queuing
      await this.actorManager.schedule(actorJob, 'poll');

      console.log(`📦 Batch job scheduled: ${jobId} for ${batchBusinesses.length} businesses`);

    } catch (error) {
      console.error('Error creating batch job:', error);
      throw error;
    }
  }

  /**
   * Get current polling status and statistics
   */
  getPollingStatus(): {
    isPolling: boolean;
    batchSize: number;
    currentBatchOffset: number;
    pollingInterval: number;
  } {
    return {
      isPolling: this.isPolling,
      batchSize: this.batchSize,
      currentBatchOffset: this.currentBatchOffset,
      pollingInterval: this.pollingInterval
    };
  }

  /**
   * Manually trigger a poll cycle
   */
  async triggerPoll(): Promise<void> {
    if (!this.isPolling) {
      throw new Error('Polling service is not running');
    }
    await this.poll();
  }

  /**
   * Reset the batch offset to start from the beginning
   */
  resetBatchOffset(): void {
    this.currentBatchOffset = 0;
    console.log('Batch offset reset to 0');
  }

  /**
   * Update batch size
   */
  setBatchSize(newBatchSize: number): void {
    if (newBatchSize <= 0 || newBatchSize > 100) {
      throw new Error('Batch size must be between 1 and 100');
    }
    this.batchSize = newBatchSize;
    console.log(`Batch size updated to ${newBatchSize}`);
  }

  async close(): Promise<void> {
    this.stop();
    await this.metadataService.close();
    await this.database.close();
  }
} 