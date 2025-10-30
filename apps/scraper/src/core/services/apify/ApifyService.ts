import { randomUUID } from 'crypto';
import { MarketPlatform } from '@prisma/client';
import type { 
  IApifyService, 
  IApifyJob, 
  IApifyJobResult, 
  ApifyJobPriority, 
  ApifyJobStatus, 
  ApifyJobOptions,
  ApifyJobStatistics 
} from '../../interfaces/IApifyService';
import { GoogleApifyActor } from './actors/GoogleApifyActor';
import { FacebookApifyActor } from './actors/FacebookApifyActor';
import { TripAdvisorApifyActor } from './actors/TripAdvisorApifyActor';
import { BookingApifyActor } from './actors/BookingApifyActor';
import { ApifyDataProcessor } from './ApifyDataProcessor';
import type { IDependencyContainer } from '../../interfaces/IDependencyContainer';
import type { IBusinessService } from '../../interfaces/IBusinessService';
import type { IReviewService } from '../../interfaces/IReviewService';
import { SERVICE_TOKENS } from '../../interfaces/IDependencyContainer';
import { logger } from '../../../utils/logger';

/**
 * Main Apify Service Implementation
 * Follows Single Responsibility Principle (SRP) - orchestrates Apify operations
 * Follows Open/Closed Principle (OCP) - can be extended with new actors
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
export class ApifyService implements IApifyService {
  private jobs: Map<string, IApifyJob> = new Map();
  private runningJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 5;
  private memoryLimitMB: number = 32 * 1024; // 32GB
  private currentMemoryUsage: number = 0;
  
  private actors: Map<MarketPlatform, any> = new Map();
  private dataProcessor: ApifyDataProcessor;
  private container: IDependencyContainer;

  constructor(apifyToken: string, container: IDependencyContainer) {
    this.container = container;
    this.dataProcessor = new ApifyDataProcessor();
    
    // Initialize platform-specific actors
    this.initializeActors(apifyToken);
  }

  private initializeActors(apifyToken: string): void {
    this.actors.set(MarketPlatform.GOOGLE_MAPS, new GoogleApifyActor(apifyToken));
    this.actors.set(MarketPlatform.FACEBOOK, new FacebookApifyActor(apifyToken));
    this.actors.set(MarketPlatform.TRIPADVISOR, new TripAdvisorApifyActor(apifyToken));
    this.actors.set(MarketPlatform.BOOKING, new BookingApifyActor(apifyToken));
    
    logger.info('[ApifyService] Initialized actors for all platforms');
  }

  async createJob(
    platform: MarketPlatform, 
    teamId: string, 
    identifier: string, 
    options: ApifyJobOptions = {}
  ): Promise<IApifyJob> {
    const jobId = randomUUID();
    const job: IApifyJob = {
      id: jobId,
      platform,
      teamId,
      identifier,
      isInitialization: options.isInitialization || false,
      maxReviews: options.maxReviews,
      priority: options.priority || ApifyJobPriority.MEDIUM,
      createdAt: new Date(),
      status: ApifyJobStatus.PENDING,
      retryCount: 0,
      maxRetries: options.maxRetries || 3
    };

    this.jobs.set(jobId, job);
    logger.info(`[ApifyService] Created job ${jobId} for platform ${platform}, team ${teamId}`);
    
    return job;
  }

  async executeJob(job: IApifyJob): Promise<IApifyJobResult> {
    const startTime = Date.now();
    
    try {
      // Check if we can run the job (memory and concurrency limits)
      if (!this.canRunJob(job)) {
        throw new Error('Cannot run job: memory or concurrency limit exceeded');
      }

      // Update job status
      job.status = ApifyJobStatus.RUNNING;
      job.startedAt = new Date();
      this.runningJobs.add(job.id);

      logger.info(`[ApifyService] Starting execution of job ${job.id} for platform ${job.platform}`);

      // Get the appropriate actor
      const actor = this.actors.get(job.platform);
      if (!actor) {
        throw new Error(`No actor found for platform: ${job.platform}`);
      }

      // Prepare input for the actor
      const input = this.prepareActorInput(job);
      
      // Execute the actor
      const result = await actor.execute(input);
      
      // Process the data if successful
      if (result.success && result.data) {
        await this.processAndStoreData(result, job);
      }

      // Update job status
      job.status = result.success ? ApifyJobStatus.COMPLETED : ApifyJobStatus.FAILED;
      job.completedAt = new Date();
      this.runningJobs.delete(job.id);

      const processingTime = Date.now() - startTime;
      logger.info(`[ApifyService] Job ${job.id} completed in ${processingTime}ms`);

      return {
        ...result,
        processingTimeMs: processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update job status
      job.status = ApifyJobStatus.FAILED;
      job.errorMessage = errorMessage;
      job.completedAt = new Date();
      this.runningJobs.delete(job.id);

      logger.error(`[ApifyService] Job ${job.id} failed:`, error);

      return {
        success: false,
        jobId: job.id,
        platform: job.platform,
        reviewsProcessed: 0,
        error: errorMessage,
        processingTimeMs: processingTime
      };
    }
  }

  private prepareActorInput(job: IApifyJob): any {
    const baseInput = {
      jobId: job.id,
      maxReviews: job.maxReviews || (job.isInitialization ? 1000 : 100)
    };

    switch (job.platform) {
      case MarketPlatform.GOOGLE_MAPS:
        return {
          ...baseInput,
          placeIds: [job.identifier]
        };
      
      case MarketPlatform.FACEBOOK:
        return {
          ...baseInput,
          pageId: job.identifier,
          pageUrl: job.identifier.startsWith('http') ? job.identifier : undefined
        };
      
      case MarketPlatform.TRIPADVISOR:
        return {
          ...baseInput,
          locationId: job.identifier,
          tripAdvisorUrl: job.identifier.startsWith('http') ? job.identifier : undefined
        };
      
      case MarketPlatform.BOOKING:
        return {
          ...baseInput,
          bookingUrl: job.identifier
        };
      
      default:
        throw new Error(`Unsupported platform: ${job.platform}`);
    }
  }

  private async processAndStoreData(result: IApifyJobResult, job: IApifyJob): Promise<void> {
    try {
      // Process the raw data
      const processedData = await this.dataProcessor.processReviewData(result.data, job.platform);
      
      // Get the appropriate business service
      const businessService = this.getBusinessService(job.platform);
      const reviewService = this.getReviewService(job.platform);
      
      // Find or create business profile
      const businessProfile = await businessService.getProfile(job.teamId, job.platform);
      
      if (!businessProfile.success || !businessProfile.businessId) {
        logger.warn(`[ApifyService] No business profile found for team ${job.teamId}, platform ${job.platform}`);
        return;
      }

      // Store the reviews
      await reviewService.saveReviews(businessProfile.businessId, processedData);
      
      logger.info(`[ApifyService] Successfully stored ${processedData.length} reviews for job ${job.id}`);
      
    } catch (error) {
      logger.error(`[ApifyService] Error processing and storing data for job ${job.id}:`, error);
      throw error;
    }
  }

  private getBusinessService(platform: MarketPlatform): IBusinessService {
    const serviceToken = this.getBusinessServiceToken(platform);
    return this.container.getService<IBusinessService>(serviceToken);
  }

  private getReviewService(platform: MarketPlatform): IReviewService<any> {
    const serviceToken = this.getReviewServiceToken(platform);
    return this.container.getService<IReviewService<any>>(serviceToken);
  }

  private getBusinessServiceToken(platform: MarketPlatform): string {
    switch (platform) {
      case MarketPlatform.GOOGLE_MAPS:
        return SERVICE_TOKENS.GOOGLE_BUSINESS_SERVICE;
      case MarketPlatform.FACEBOOK:
        return SERVICE_TOKENS.FACEBOOK_BUSINESS_SERVICE;
      case MarketPlatform.TRIPADVISOR:
        return SERVICE_TOKENS.TRIPADVISOR_BUSINESS_SERVICE;
      case MarketPlatform.BOOKING:
        return SERVICE_TOKENS.BOOKING_BUSINESS_SERVICE;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private getReviewServiceToken(platform: MarketPlatform): string {
    switch (platform) {
      case MarketPlatform.GOOGLE_MAPS:
        return SERVICE_TOKENS.GOOGLE_REVIEW_SERVICE;
      case MarketPlatform.FACEBOOK:
        return SERVICE_TOKENS.FACEBOOK_REVIEW_SERVICE;
      case MarketPlatform.TRIPADVISOR:
        return SERVICE_TOKENS.TRIPADVISOR_REVIEW_SERVICE;
      case MarketPlatform.BOOKING:
        return SERVICE_TOKENS.BOOKING_REVIEW_SERVICE;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private canRunJob(job: IApifyJob): boolean {
    // Check concurrency limit
    if (this.runningJobs.size >= this.maxConcurrentJobs) {
      return false;
    }

    // Check memory limit
    const actor = this.actors.get(job.platform);
    if (actor) {
      const memoryRequired = actor.getMemoryEstimate(this.prepareActorInput(job));
      if (this.currentMemoryUsage + memoryRequired > this.memoryLimitMB) {
        return false;
      }
    }

    return true;
  }

  async getJobStatus(jobId: string): Promise<IApifyJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = ApifyJobStatus.CANCELLED;
      this.runningJobs.delete(jobId);
      logger.info(`[ApifyService] Cancelled job ${jobId}`);
    }
  }

  async retryJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job && job.retryCount < job.maxRetries) {
      job.retryCount++;
      job.status = ApifyJobStatus.PENDING;
      job.errorMessage = undefined;
      logger.info(`[ApifyService] Retrying job ${jobId} (attempt ${job.retryCount})`);
    }
  }

  async executeBatchJobs(jobs: IApifyJob[]): Promise<IApifyJobResult[]> {
    const results: IApifyJobResult[] = [];
    
    for (const job of jobs) {
      try {
        const result = await this.executeJob(job);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          jobId: job.id,
          platform: job.platform,
          reviewsProcessed: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: 0
        });
      }
    }

    return results;
  }

  async scheduleBatchJobs(jobs: IApifyJob[]): Promise<void> {
    for (const job of jobs) {
      this.jobs.set(job.id, job);
    }
    logger.info(`[ApifyService] Scheduled ${jobs.length} batch jobs`);
  }

  async getActiveJobs(): Promise<IApifyJob[]> {
    return Array.from(this.jobs.values()).filter(job => 
      job.status === ApifyJobStatus.RUNNING || job.status === ApifyJobStatus.PENDING
    );
  }

  async getJobsByTeam(teamId: string): Promise<IApifyJob[]> {
    return Array.from(this.jobs.values()).filter(job => job.teamId === teamId);
  }

  async getJobsByPlatform(platform: MarketPlatform): Promise<IApifyJob[]> {
    return Array.from(this.jobs.values()).filter(job => job.platform === platform);
  }

  async getJobStatistics(): Promise<ApifyJobStatistics> {
    const allJobs = Array.from(this.jobs.values());
    const completedJobs = allJobs.filter(job => job.status === ApifyJobStatus.COMPLETED);
    const failedJobs = allJobs.filter(job => job.status === ApifyJobStatus.FAILED);
    const runningJobs = allJobs.filter(job => job.status === ApifyJobStatus.RUNNING);
    const pendingJobs = allJobs.filter(job => job.status === ApifyJobStatus.PENDING);

    const platformBreakdown: Record<MarketPlatform, number> = {} as Record<MarketPlatform, number>;
    Object.values(MarketPlatform).forEach(platform => {
      platformBreakdown[platform] = allJobs.filter(job => job.platform === platform).length;
    });

    const averageProcessingTime = completedJobs.length > 0 
      ? completedJobs.reduce((sum, job) => {
          const processingTime = job.completedAt && job.startedAt 
            ? job.completedAt.getTime() - job.startedAt.getTime()
            : 0;
          return sum + processingTime;
        }, 0) / completedJobs.length
      : 0;

    return {
      totalJobs: allJobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      runningJobs: runningJobs.length,
      pendingJobs: pendingJobs.length,
      averageProcessingTimeMs: averageProcessingTime,
      successRate: allJobs.length > 0 ? (completedJobs.length / allJobs.length) * 100 : 0,
      platformBreakdown
    };
  }

  setJobPriority(jobId: string, priority: ApifyJobPriority): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.priority = priority;
    }
    return Promise.resolve();
  }

  setMaxConcurrentJobs(maxJobs: number): void {
    this.maxConcurrentJobs = maxJobs;
  }

  setMemoryLimit(memoryLimitMB: number): void {
    this.memoryLimitMB = memoryLimitMB;
  }
}
