import type { Request, Response } from 'express';
import { BaseApiController } from './BaseApiController';
import type { IAnalyticsApiController } from '../interfaces/IApiController';
import type { AnalyticsRequest } from '../dto/ApiRequest';
import type { AnalyticsResponse } from '../dto/ApiResponse';
import { MarketPlatform } from '@prisma/client';
import type { IDependencyContainer } from '../../interfaces/IDependencyContainer';
import type { IAnalyticsService } from '../../interfaces/IAnalyticsService';
import type { SERVICE_TOKENS } from '../../interfaces/IDependencyContainer';

/**
 * Analytics API Controller
 * Follows Single Responsibility Principle (SRP) - only handles analytics operations
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions via DI container
 */
export class AnalyticsApiController extends BaseApiController implements IAnalyticsApiController {
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
      case 'GET':
        await this.getAnalytics(req, res);
        break;
      case 'POST':
        await this.processAnalytics(req, res);
        break;
      default:
        this.sendErrorResponse(res, 405, 'Method not allowed');
    }
  }

  /**
   * Get analytics
   * Follows Single Responsibility Principle (SRP) - only handles analytics retrieval
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const { platform, identifier } = req.query;

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
      const analytics = await analyticsService.getAnalytics(identifier as string || '');
      
      const response: AnalyticsResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        platform: marketPlatform,
        data: analytics,
        message: 'Analytics retrieved successfully'
      };
      
      this.sendSuccessResponse(res, 200, response);

    } catch (error) {
      this.handleServiceError(error, res, 'get analytics');
    }
  }

  /**
   * Process analytics
   * Follows Single Responsibility Principle (SRP) - only handles analytics processing
   */
  async processAnalytics(req: Request, res: Response): Promise<void> {
    try {
      // Validate required fields
      const validationError = this.validateRequiredFields(req, ['teamId', 'identifier']);
      if (validationError) {
        this.sendErrorResponse(res, 400, validationError);
        return;
      }

      const { teamId, identifier, platform } = req.body as AnalyticsRequest;
      
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

      // Get appropriate analytics service
      const analyticsService = this.getAnalyticsService(marketPlatform);
      
      // Process analytics
      const result = await analyticsService.processReviews(identifier as string);
      
      if (result.success) {
        const response: AnalyticsResponse = {
          success: true,
          timestamp: new Date().toISOString(),
          platform: marketPlatform,
          data: result.analyticsData,
          message: 'Analytics processed successfully'
        };
        this.sendSuccessResponse(res, 200, response);
      } else {
        this.sendErrorResponse(res, 400, result.error || 'Failed to process analytics');
      }

    } catch (error) {
      this.handleServiceError(error, res, 'process analytics');
    }
  }

  /**
   * Get appropriate analytics service for platform
   * Follows Open/Closed Principle (OCP) - easy to extend for new platforms
   */
  private getAnalyticsService(platform: MarketPlatform): IAnalyticsService {
    const token = this.getAnalyticsServiceToken(platform);
    return this.container.getService<IAnalyticsService>(token);
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
