import { MarketPlatform } from '@prisma/client';
import { IBusinessService, BusinessProfileResult } from '../interfaces/IBusinessService';
import { IReviewService, ReviewResult } from '../interfaces/IReviewService';
import { IAnalyticsService, AnalyticsResult } from '../interfaces/IAnalyticsService';
import { IDependencyContainer, SERVICE_TOKENS } from '../interfaces/IDependencyContainer';
import { ITaskTracker, TaskStep, TaskStatus } from '../interfaces/ITaskTracker';

/**
 * Unified Business Service
 * Follows Single Responsibility Principle (SRP) - coordinates business operations
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
export class UnifiedBusinessService {
  private taskTracker: ITaskTracker;

  constructor(private container: IDependencyContainer) {
    this.taskTracker = this.container.getService<ITaskTracker>(SERVICE_TOKENS.TASK_TRACKER_SERVICE);
  }

  /**
   * Create business profile for any platform with task tracking
   * Follows Open/Closed Principle - easy to add new platforms
   */
  async createBusinessProfile(
    teamId: string,
    platform: MarketPlatform,
    identifier: string
  ): Promise<BusinessProfileResult> {
    try {
      // Start task tracking
      await this.taskTracker.startStep(teamId, platform, TaskStep.CREATING_PROFILE, `Creating ${platform} business profile...`);
      
      const serviceToken = this.getBusinessServiceToken(platform);
      const businessService = this.container.getService<IBusinessService>(serviceToken);
      
      const result = await businessService.createProfile(teamId, platform, identifier);
      
      if (result.success) {
        await this.taskTracker.completeStep(teamId, platform, TaskStep.CREATING_PROFILE, `${platform} business profile created successfully`, result);
      } else {
        await this.taskTracker.failStep(teamId, platform, TaskStep.CREATING_PROFILE, result.error || 'Failed to create business profile');
      }
      
      return result;
    } catch (error) {
      await this.taskTracker.failStep(teamId, platform, TaskStep.CREATING_PROFILE, `Error creating business profile: ${error}`);
      throw error;
    }
  }

  /**
   * Get business profile for any platform
   */
  async getBusinessProfile(
    teamId: string,
    platform: MarketPlatform
  ): Promise<BusinessProfileResult> {
    const serviceToken = this.getBusinessServiceToken(platform);
    const businessService = this.container.getService<IBusinessService>(serviceToken);
    
    return await businessService.getProfile(teamId, platform);
  }

  /**
   * Save reviews for any platform
   */
  async saveBusinessReviews(
    businessId: string,
    platform: MarketPlatform,
    reviews: any[]
  ): Promise<ReviewResult> {
    const serviceToken = this.getReviewServiceToken(platform);
    const reviewService = this.container.getService<IReviewService<any>>(serviceToken);
    
    return await reviewService.saveReviews(businessId, reviews);
  }

  /**
   * Process analytics for any platform with task tracking
   */
  async processBusinessAnalytics(
    businessId: string,
    platform: MarketPlatform
  ): Promise<AnalyticsResult> {
    const serviceToken = this.getAnalyticsServiceToken(platform);
    const analyticsService = this.container.getService<IAnalyticsService>(serviceToken);
    
    return await analyticsService.processReviews(businessId);
  }

  /**
   * Trigger review scraping with task tracking
   * Follows Single Responsibility Principle (SRP) - only triggers review scraping
   */
  async triggerReviewScraping(
    teamId: string,
    platform: MarketPlatform,
    identifier: string
  ): Promise<{ success: boolean; jobId?: string; message?: string; error?: string }> {
    try {
      await this.taskTracker.startStep(teamId, platform, TaskStep.FETCHING_REVIEWS, `Starting ${platform} review scraping...`);
      
      // TODO: Integrate with actual review scraping service (ActorManager)
      // For now, simulate the process
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await this.taskTracker.updateProgress(teamId, platform, {
        step: TaskStep.FETCHING_REVIEWS,
        status: TaskStatus.IN_PROGRESS,
        message: `Review scraping job ${jobId} started`,
        messageType: 'info',
        progressPercent: 25
      });
      
      // Simulate progress updates
      setTimeout(async () => {
        await this.taskTracker.updateProgress(teamId, platform, {
          step: TaskStep.FETCHING_REVIEWS,
          status: TaskStatus.IN_PROGRESS,
          message: 'Collecting reviews from platform...',
          messageType: 'info',
          progressPercent: 50
        });
      }, 1000);
      
      setTimeout(async () => {
        await this.taskTracker.updateProgress(teamId, platform, {
          step: TaskStep.FETCHING_REVIEWS,
          status: TaskStatus.IN_PROGRESS,
          message: 'Processing and analyzing reviews...',
          messageType: 'info',
          progressPercent: 75
        });
      }, 2000);
      
      setTimeout(async () => {
        await this.taskTracker.completeStep(teamId, platform, TaskStep.FETCHING_REVIEWS, 'Review scraping completed successfully', { jobId });
      }, 3000);
      
      return {
        success: true,
        jobId,
        message: 'Review scraping started successfully'
      };
    } catch (error) {
      await this.taskTracker.failStep(teamId, platform, TaskStep.FETCHING_REVIEWS, `Error starting review scraping: ${error}`);
      return {
        success: false,
        error: `Failed to start review scraping: ${error}`
      };
    }
  }

  /**
   * Get reviews for any platform
   * Follows Single Responsibility Principle (SRP) - only gets reviews
   */
  async getReviews(
    teamId: string,
    platform: MarketPlatform,
    identifier: string
  ): Promise<any[]> {
    const serviceToken = this.getReviewServiceToken(platform);
    const reviewService = this.container.getService<IReviewService<any>>(serviceToken);
    
    // For now, return empty array - this would need to be implemented based on business logic
    return [];
  }

  /**
   * Get analytics for any platform with task tracking
   * Follows Single Responsibility Principle (SRP) - only gets analytics
   */
  async getAnalytics(
    teamId: string,
    platform: MarketPlatform,
    identifier: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      await this.taskTracker.startStep(teamId, platform, TaskStep.PROCESSING_ANALYTICS, `Processing ${platform} analytics...`);
      
      const serviceToken = this.getAnalyticsServiceToken(platform);
      const analyticsService = this.container.getService<IAnalyticsService>(serviceToken);
      
      // For now, simulate analytics processing
      await this.taskTracker.updateProgress(teamId, platform, {
        step: TaskStep.PROCESSING_ANALYTICS,
        status: TaskStatus.IN_PROGRESS,
        message: 'Analyzing review data...',
        messageType: 'info',
        progressPercent: 50
      });
      
      const result = await analyticsService.getAnalytics(identifier);
      
      if (result) {
        await this.taskTracker.completeStep(teamId, platform, TaskStep.PROCESSING_ANALYTICS, 'Analytics processed successfully', result);
        return { success: true, data: result };
      } else {
        await this.taskTracker.failStep(teamId, platform, TaskStep.PROCESSING_ANALYTICS, 'No analytics data found');
        return { success: false, error: 'No analytics data found' };
      }
    } catch (error) {
      await this.taskTracker.failStep(teamId, platform, TaskStep.PROCESSING_ANALYTICS, `Error processing analytics: ${error}`);
      return { success: false, error: `Failed to process analytics: ${error}` };
    }
  }

  /**
   * Get service token for business service based on platform
   * Follows Open/Closed Principle - easy to extend for new platforms
   */
  private getBusinessServiceToken(platform: MarketPlatform): string {
    switch (platform) {
      case 'GOOGLE_MAPS':
        return SERVICE_TOKENS.GOOGLE_BUSINESS_SERVICE;
      case 'FACEBOOK':
        return SERVICE_TOKENS.FACEBOOK_BUSINESS_SERVICE;
      case 'TRIPADVISOR':
        return SERVICE_TOKENS.TRIPADVISOR_BUSINESS_SERVICE;
      case 'BOOKING':
        return SERVICE_TOKENS.BOOKING_BUSINESS_SERVICE;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Get service token for review service based on platform
   */
  private getReviewServiceToken(platform: MarketPlatform): string {
    switch (platform) {
      case 'GOOGLE_MAPS':
        return SERVICE_TOKENS.GOOGLE_REVIEW_SERVICE;
      case 'FACEBOOK':
        return SERVICE_TOKENS.FACEBOOK_REVIEW_SERVICE;
      case 'TRIPADVISOR':
        return SERVICE_TOKENS.TRIPADVISOR_REVIEW_SERVICE;
      case 'BOOKING':
        return SERVICE_TOKENS.BOOKING_REVIEW_SERVICE;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Get service token for analytics service based on platform
   */
  private getAnalyticsServiceToken(platform: MarketPlatform): string {
    switch (platform) {
      case 'GOOGLE_MAPS':
        return SERVICE_TOKENS.GOOGLE_ANALYTICS_SERVICE;
      case 'FACEBOOK':
        return SERVICE_TOKENS.FACEBOOK_ANALYTICS_SERVICE;
      case 'TRIPADVISOR':
        return SERVICE_TOKENS.TRIPADVISOR_ANALYTICS_SERVICE;
      case 'BOOKING':
        return SERVICE_TOKENS.BOOKING_ANALYTICS_SERVICE;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
