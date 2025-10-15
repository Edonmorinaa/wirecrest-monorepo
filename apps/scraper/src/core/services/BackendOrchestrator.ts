import { MarketPlatform } from '@prisma/client';
import { IDependencyContainer } from '../interfaces/IDependencyContainer';
import { IApifyService, ApifyJobPriority, ApifyJobStatus } from '../interfaces/IApifyService';
import { IBusinessService } from '../interfaces/IBusinessService';
import { IReviewService } from '../interfaces/IReviewService';
import { IAnalyticsService } from '../interfaces/IAnalyticsService';
import { ITaskTracker, TaskStep, TaskStatus } from '../interfaces/ITaskTracker';
import { SERVICE_TOKENS } from '../interfaces/IDependencyContainer';
import { logger } from '../../utils/logger';
import { FeatureFlagService } from '../../services/FeatureFlagService';
/**
 * Backend Orchestrator
 * Follows Single Responsibility Principle (SRP) - orchestrates the entire data flow
 * Follows Open/Closed Principle (OCP) - can be extended with new workflows
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
export class BackendOrchestrator {
  private container: IDependencyContainer;
  private apifyService: IApifyService;
  private taskTracker: ITaskTracker;
  private featureFlagService: FeatureFlagService;

  constructor(container: IDependencyContainer, apifyService: IApifyService, featureFlagService: FeatureFlagService) {
    this.container = container;
    this.apifyService = apifyService;
    this.featureFlagService = featureFlagService;
    this.taskTracker = container.getService<ITaskTracker>(SERVICE_TOKENS.TASK_TRACKER_SERVICE);
  }

  /**
   * Main function: Complete data flow from Apify to database with analytics
   * This is the core function that orchestrates the entire backend process
   */
  async processBusinessData(
    teamId: string,
    platform: MarketPlatform,
    identifier: string,
    options: {
      isInitialization?: boolean;
      maxReviews?: number;
      forceRefresh?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    businessId?: string;
    reviewsProcessed?: number;
    analyticsGenerated?: boolean;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      logger.info(`[BackendOrchestrator] Starting complete data flow for team ${teamId}, platform ${platform}, identifier ${identifier}`);

      // Check feature flags before processing
      const platformEnabled = await this.featureFlagService.isPlatformEnabled(teamId, platform.toLowerCase());
      if (!platformEnabled) {
        logger.warn(`[BackendOrchestrator] Platform ${platform} is not enabled for team ${teamId}`);
        return {
          success: false,
          error: `Platform ${platform} is not enabled for this team`
        };
      }

      // Get scrape interval from feature flags
      const scrapeInterval = await this.featureFlagService.getScrapeInterval(teamId);
      logger.info(`[BackendOrchestrator] Scrape interval for team ${teamId}: ${scrapeInterval} hours`);

      // Step 1: Create or get business profile
      const businessResult = await this.createOrGetBusinessProfile(teamId, platform, identifier);
      if (!businessResult.success || !businessResult.businessId) {
        return {
          success: false,
          error: businessResult.error || 'Failed to create/get business profile'
        };
      }

      // Step 2: Create task for tracking
      const task = await this.taskTracker.createTask(teamId, platform, identifier);
      await this.taskTracker.startStep(teamId, platform, TaskStep.CREATING_PROFILE, 'Business profile ready, starting data collection...');

      // Step 3: Create and execute Apify job
      const apifyJob = await this.apifyService.createJob(platform, teamId, identifier, {
        isInitialization: options.isInitialization || false,
        maxReviews: options.maxReviews,
        priority: options.isInitialization ? ApifyJobPriority.HIGH : ApifyJobPriority.MEDIUM
      });

      await this.taskTracker.updateProgress(teamId, platform, {
        step: TaskStep.FETCHING_REVIEWS,
        status: TaskStatus.IN_PROGRESS,
        message: 'Starting review data collection from Apify...',
        messageType: 'info',
        progressPercent: 25
      });

      const apifyResult = await this.apifyService.executeJob(apifyJob);
      
      if (!apifyResult.success) {
        await this.taskTracker.failStep(teamId, platform, TaskStep.FETCHING_REVIEWS, apifyResult.error || 'Apify job failed');
        return {
          success: false,
          businessId: businessResult.businessId,
          error: apifyResult.error || 'Failed to collect review data'
        };
      }

      await this.taskTracker.updateProgress(teamId, platform, {
        step: TaskStep.FETCHING_REVIEWS,
        status: TaskStatus.IN_PROGRESS,
        message: `Successfully collected ${apifyResult.reviewsProcessed} reviews`,
        messageType: 'success',
        progressPercent: 75
      });

      // Step 4: Process analytics
      await this.taskTracker.startStep(teamId, platform, TaskStep.PROCESSING_ANALYTICS, 'Processing review analytics...');
      
      const analyticsResult = await this.processAnalytics(businessResult.businessId, platform);
      
      if (analyticsResult) {
        await this.taskTracker.completeStep(teamId, platform, TaskStep.PROCESSING_ANALYTICS, 'Analytics processed successfully');
      } else {
        await this.taskTracker.failStep(teamId, platform, TaskStep.PROCESSING_ANALYTICS, 'Failed to process analytics');
      }

      // Step 5: Complete the task
      await this.taskTracker.completeStep(teamId, platform, TaskStep.COMPLETED, 'Data processing completed successfully');

      const processingTime = Date.now() - startTime;
      logger.info(`[BackendOrchestrator] Completed data flow in ${processingTime}ms. Reviews processed: ${apifyResult.reviewsProcessed}`);

      return {
        success: true,
        businessId: businessResult.businessId,
        reviewsProcessed: apifyResult.reviewsProcessed,
        analyticsGenerated: !!analyticsResult
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[BackendOrchestrator] Error in data flow:`, error);
      
      await this.taskTracker.failStep(teamId, platform, TaskStep.CREATING_PROFILE, errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Batch process multiple businesses
   */
  async processBatchBusinessData(
    businesses: Array<{
      teamId: string;
      platform: MarketPlatform;
      identifier: string;
      options?: {
        isInitialization?: boolean;
        maxReviews?: number;
        forceRefresh?: boolean;
      };
    }>
  ): Promise<Array<{
    teamId: string;
    platform: MarketPlatform;
    identifier: string;
    success: boolean;
    businessId?: string;
    reviewsProcessed?: number;
    error?: string;
  }>> {
    logger.info(`[BackendOrchestrator] Starting batch processing of ${businesses.length} businesses`);

    const results = [];
    
    for (const business of businesses) {
      try {
        const result = await this.processBusinessData(
          business.teamId,
          business.platform,
          business.identifier,
          business.options || {}
        );

        results.push({
          teamId: business.teamId,
          platform: business.platform,
          identifier: business.identifier,
          ...result
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          teamId: business.teamId,
          platform: business.platform,
          identifier: business.identifier,
          success: false,
          error: errorMessage
        });
      }
    }

    logger.info(`[BackendOrchestrator] Batch processing completed. ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
  }

  /**
   * Get business data with reviews and analytics
   */
  async getBusinessData(
    teamId: string,
    platform: MarketPlatform
  ): Promise<{
    success: boolean;
    businessProfile?: any;
    reviews?: any[];
    analytics?: any;
    error?: string;
  }> {
    try {
      // Get business profile
      const businessService = this.getBusinessService(platform);
      const businessResult = await businessService.getProfile(teamId, platform);
      
      if (!businessResult.success || !businessResult.businessId) {
        return {
          success: false,
          error: 'Business profile not found'
        };
      }

      // Get reviews
      const reviewService = this.getReviewService(platform);
      const reviews = await reviewService.getReviewsWithMetadata(businessResult.businessId);

      // Get analytics
      const analyticsService = this.getAnalyticsService(platform);
      const analytics = await analyticsService.getAnalytics(businessResult.businessId);

      return {
        success: true,
        businessProfile: businessResult.profileData,
        reviews,
        analytics
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[BackendOrchestrator] Error getting business data:`, error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Refresh business data (re-scrape and update)
   */
  async refreshBusinessData(
    teamId: string,
    platform: MarketPlatform,
    options: {
      maxReviews?: number;
      forceRefresh?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    reviewsProcessed?: number;
    analyticsUpdated?: boolean;
    error?: string;
  }> {
    try {
      // Get existing business profile
      const businessService = this.getBusinessService(platform);
      const businessResult = await businessService.getProfile(teamId, platform);
      
      if (!businessResult.success || !businessResult.businessId) {
        return {
          success: false,
          error: 'Business profile not found'
        };
      }

      // Get the identifier from the business profile
      const identifier = this.extractIdentifierFromProfile(businessResult.profileData, platform);
      if (!identifier) {
        return {
          success: false,
          error: 'Could not extract identifier from business profile'
        };
      }

      // Process the data with refresh flag
      const result = await this.processBusinessData(teamId, platform, identifier, {
        ...options,
        forceRefresh: true
      });

      return {
        success: result.success,
        reviewsProcessed: result.reviewsProcessed,
        analyticsUpdated: result.analyticsGenerated,
        error: result.error
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[BackendOrchestrator] Error refreshing business data:`, error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async createOrGetBusinessProfile(
    teamId: string,
    platform: MarketPlatform,
    identifier: string
  ): Promise<{
    success: boolean;
    businessId?: string;
    error?: string;
  }> {
    try {
      const businessService = this.getBusinessService(platform);
      
      // Try to get existing profile first
      const existingProfile = await businessService.getProfile(teamId, platform);
      
      if (existingProfile.success && existingProfile.businessId) {
        logger.info(`[BackendOrchestrator] Found existing business profile for team ${teamId}, platform ${platform}`);
        return {
          success: true,
          businessId: existingProfile.businessId
        };
      }

      // Create new profile if not found
      const createResult = await businessService.createProfile(teamId, platform, identifier);
      
      if (!createResult.success) {
        return {
          success: false,
          error: createResult.error || 'Failed to create business profile'
        };
      }

      logger.info(`[BackendOrchestrator] Created new business profile for team ${teamId}, platform ${platform}`);
      return {
        success: true,
        businessId: createResult.businessId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[BackendOrchestrator] Error creating/getting business profile:`, error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async processAnalytics(businessId: string, platform: MarketPlatform): Promise<boolean> {
    try {
      const analyticsService = this.getAnalyticsService(platform);
      const result = await analyticsService.processReviews(businessId);
      
      return result.success;
    } catch (error) {
      logger.error(`[BackendOrchestrator] Error processing analytics:`, error);
      return false;
    }
  }

  private extractIdentifierFromProfile(profile: any, platform: MarketPlatform): string | null {
    switch (platform) {
      case MarketPlatform.GOOGLE_MAPS:
        return profile.placeId;
      case MarketPlatform.FACEBOOK:
        return profile.pageId || profile.facebookUrl;
      case MarketPlatform.TRIPADVISOR:
        return profile.locationId || profile.tripAdvisorUrl;
      case MarketPlatform.BOOKING:
        return profile.bookingUrl;
      default:
        return null;
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

  private getAnalyticsService(platform: MarketPlatform): IAnalyticsService {
    const serviceToken = this.getAnalyticsServiceToken(platform);
    return this.container.getService<IAnalyticsService>(serviceToken);
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

  private getAnalyticsServiceToken(platform: MarketPlatform): string {
    switch (platform) {
      case MarketPlatform.GOOGLE_MAPS:
        return SERVICE_TOKENS.GOOGLE_ANALYTICS_SERVICE;
      case MarketPlatform.FACEBOOK:
        return SERVICE_TOKENS.FACEBOOK_ANALYTICS_SERVICE;
      case MarketPlatform.TRIPADVISOR:
        return SERVICE_TOKENS.TRIPADVISOR_ANALYTICS_SERVICE;
      case MarketPlatform.BOOKING:
        return SERVICE_TOKENS.BOOKING_ANALYTICS_SERVICE;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
