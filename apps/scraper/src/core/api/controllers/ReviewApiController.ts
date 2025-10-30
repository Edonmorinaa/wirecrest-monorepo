import type { Request, Response } from 'express';
import { BaseApiController } from './BaseApiController';
import type { IReviewApiController } from '../interfaces/IApiController';
import type { ReviewRequest } from '../dto/ApiRequest';
import type { ReviewResponse } from '../dto/ApiResponse';
import type { MarketPlatform } from '@prisma/client';
import type { IDependencyContainer } from '../../interfaces/IDependencyContainer';
import type { IReviewService } from '../../interfaces/IReviewService';
import type { SERVICE_TOKENS } from '../../interfaces/IDependencyContainer';

/**
 * Review API Controller
 * Follows Single Responsibility Principle (SRP) - only handles review operations
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions via DI container
 */
export class ReviewApiController extends BaseApiController implements IReviewApiController {
  private container: IDependencyContainer;

  constructor(container: IDependencyContainer) {
    super();
    this.container = container;
  }

  /**
   * Handle main request - delegates to appropriate method based on HTTP method
   */
  async handleRequest(req: Request, res: Response): Promise<void> {
    switch (req.method) {
      case 'POST':
        await this.triggerReviewScraping(req, res);
        break;
      case 'GET':
        await this.getReviews(req, res);
        break;
      default:
        this.sendErrorResponse(res, 405, 'Method not allowed');
    }
  }

  /**
   * Trigger review scraping
   * Follows Single Responsibility Principle (SRP) - only handles review scraping
   */
  async triggerReviewScraping(req: Request, res: Response): Promise<void> {
    try {
      // Validate required fields
      const validationError = this.validateRequiredFields(req, ['teamId', 'identifier']);
      if (validationError) {
        this.sendErrorResponse(res, 400, validationError);
        return;
      }

      const { teamId, identifier, platform, forceRefresh = false } = req.body as ReviewRequest;
      
      // Validate team ID
      if (!this.validateTeamId(teamId)) {
        this.sendErrorResponse(res, 400, 'Invalid team ID format');
        return;
      }

      // Validate platform
      const marketPlatform = this.validatePlatform(platform || 'GOOGLE_MAPS');
      if (!marketPlatform) {
        this.sendErrorResponse(res, 400, 'Invalid platform');
        return;
      }

      // Get appropriate review service
      const reviewService = this.getReviewService(marketPlatform);
      
      // Trigger review scraping
      const result = await reviewService.triggerReviewScraping(teamId, marketPlatform, identifier);
      
      if (result.success) {
        const response: ReviewResponse = {
          success: true,
          timestamp: new Date().toISOString(),
          platform: marketPlatform,
          jobId: result.jobId,
          reviewsCount: result.reviewsCount,
          message: result.message || 'Review scraping triggered successfully'
        };
        this.sendSuccessResponse(res, 200, response);
      } else {
        this.sendErrorResponse(res, 400, result.error || 'Failed to trigger review scraping');
      }

    } catch (error) {
      this.handleServiceError(error, res, 'trigger review scraping');
    }
  }

  /**
   * Get reviews
   * Follows Single Responsibility Principle (SRP) - only handles review retrieval
   */
  async getReviews(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const { platform } = req.query;
      const { limit, offset } = this.extractPaginationParams(req);

      // Validate team ID
      if (!this.validateTeamId(teamId)) {
        this.sendErrorResponse(res, 400, 'Invalid team ID format');
        return;
      }

      // Validate platform
      const marketPlatform = this.validatePlatform(platform as string || 'GOOGLE_MAPS');
      if (!marketPlatform) {
        this.sendErrorResponse(res, 400, 'Invalid platform');
        return;
      }

      // Get appropriate review service
      const reviewService = this.getReviewService(marketPlatform);
      
      // Get reviews
      const reviews = await reviewService.getReviews(teamId, marketPlatform, '');
      
      const response: ReviewResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        platform: marketPlatform,
        reviews: reviews,
        pagination: {
          limit,
          offset,
          hasMore: reviews.length === limit
        },
        message: `Retrieved ${reviews.length} reviews`
      };
      
      this.sendSuccessResponse(res, 200, response);

    } catch (error) {
      this.handleServiceError(error, res, 'get reviews');
    }
  }

  /**
   * Get review analytics
   * Follows Single Responsibility Principle (SRP) - only handles review analytics
   */
  async getReviewAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const { platform } = req.query;

      // Validate team ID
      if (!this.validateTeamId(teamId)) {
        this.sendErrorResponse(res, 400, 'Invalid team ID format');
        return;
      }

      // Validate platform
      const marketPlatform = this.validatePlatform(platform as string || 'GOOGLE_MAPS');
      if (!marketPlatform) {
        this.sendErrorResponse(res, 400, 'Invalid platform');
        return;
      }

      // Get appropriate analytics service
      const analyticsService = this.getAnalyticsService(marketPlatform);
      
      // Get analytics
      const analytics = await analyticsService.getAnalytics(teamId, marketPlatform, '');
      
      const response: ReviewResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        platform: marketPlatform,
        reviews: analytics,
        message: 'Review analytics retrieved successfully'
      };
      
      this.sendSuccessResponse(res, 200, response);

    } catch (error) {
      this.handleServiceError(error, res, 'get review analytics');
    }
  }

  /**
   * Get appropriate review service for platform
   * Follows Open/Closed Principle (OCP) - easy to extend for new platforms
   */
  private getReviewService(platform: MarketPlatform): any {
    const token = this.getReviewServiceToken(platform);
    return this.container.getService<any>(token);
  }

  /**
   * Get appropriate analytics service for platform
   * Follows Open/Closed Principle (OCP) - easy to extend for new platforms
   */
  private getAnalyticsService(platform: MarketPlatform): any {
    const token = this.getAnalyticsServiceToken(platform);
    return this.container.getService(token);
  }

  /**
   * Get service token for review service based on platform
   * Follows Open/Closed Principle (OCP) - easy to extend for new platforms
   */
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
      case MarketPlatform.TIKTOK:
        return SERVICE_TOKENS.TIKTOK_REVIEW_SERVICE;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Get service token for analytics service based on platform
   * Follows Open/Closed Principle (OCP) - easy to extend for new platforms
   */
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
      case MarketPlatform.TIKTOK:
        return SERVICE_TOKENS.TIKTOK_ANALYTICS_SERVICE;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
