import { Request, Response } from 'express';
import { BaseApiController } from './BaseApiController';
import { IBusinessApiController } from '../interfaces/IApiController';
import { BusinessProfileRequest, BusinessProfileResponse } from '../dto/ApiRequest';
import { BusinessProfileResponse as BusinessProfileResponseDto } from '../dto/ApiResponse';
import { MarketPlatform } from '@prisma/client';
import { IDependencyContainer } from '../../interfaces/IDependencyContainer';
import { IBusinessService } from '../../interfaces/IBusinessService';
import { SERVICE_TOKENS } from '../../interfaces/IDependencyContainer';

/**
 * Business API Controller
 * Follows Single Responsibility Principle (SRP) - only handles business profile operations
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions via DI container
 */
export class BusinessApiController extends BaseApiController implements IBusinessApiController {
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
        await this.createProfile(req, res);
        break;
      case 'GET':
        await this.getProfile(req, res);
        break;
      case 'PUT':
        await this.updateProfile(req, res);
        break;
      case 'DELETE':
        await this.deleteProfile(req, res);
        break;
      default:
        this.sendErrorResponse(res, 405, 'Method not allowed');
    }
  }

  /**
   * Create business profile
   * Follows Single Responsibility Principle (SRP) - only handles profile creation
   */
  async createProfile(req: Request, res: Response): Promise<void> {
    try {
      // Validate required fields
      const validationError = this.validateRequiredFields(req, ['teamId', 'identifier']);
      if (validationError) {
        this.sendErrorResponse(res, 400, validationError);
        return;
      }

      const { teamId, identifier, platform } = req.body as BusinessProfileRequest;
      
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

      // Get appropriate business service
      const businessService = this.getBusinessService(marketPlatform);
      
      // Create business profile
      const result = await businessService.createProfile(teamId, marketPlatform, identifier);
      
      if (result.success) {
        const response: BusinessProfileResponseDto = {
          success: true,
          timestamp: new Date().toISOString(),
          platform: marketPlatform,
          businessId: result.businessId,
          profile: result.profileData,
          message: 'Business profile created successfully'
        };
        this.sendSuccessResponse(res, 200, response);
      } else {
        this.sendErrorResponse(res, 400, result.error || 'Failed to create business profile');
      }

    } catch (error) {
      this.handleServiceError(error, res, 'create business profile');
    }
  }

  /**
   * Get business profile
   * Follows Single Responsibility Principle (SRP) - only handles profile retrieval
   */
  async getProfile(req: Request, res: Response): Promise<void> {
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

      // Get appropriate business service
      const businessService = this.getBusinessService(marketPlatform);
      
      // Get business profile
      const result = await businessService.getProfile(teamId, marketPlatform);
      
      const response: BusinessProfileResponseDto = {
        success: true,
        timestamp: new Date().toISOString(),
        platform: marketPlatform,
        profile: result.profileData,
        message: result.success ? 'Business profile retrieved successfully' : 'No business profile found'
      };
      
      this.sendSuccessResponse(res, 200, response);

    } catch (error) {
      this.handleServiceError(error, res, 'get business profile');
    }
  }

  /**
   * Update business profile
   * Follows Single Responsibility Principle (SRP) - only handles profile updates
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const { platform, identifier, ...updateData } = req.body;

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

      // Get appropriate business service
      const businessService = this.getBusinessService(marketPlatform);
      
      // Update business profile
      const result = await businessService.updateProfile(teamId, marketPlatform, updateData);
      
      if (result.success) {
        const response: BusinessProfileResponseDto = {
          success: true,
          timestamp: new Date().toISOString(),
          platform: marketPlatform,
          businessId: result.businessId,
          profile: result.profileData,
          message: 'Business profile updated successfully'
        };
        this.sendSuccessResponse(res, 200, response);
      } else {
        this.sendErrorResponse(res, 400, result.error || 'Failed to update business profile');
      }

    } catch (error) {
      this.handleServiceError(error, res, 'update business profile');
    }
  }

  /**
   * Delete business profile
   * Follows Single Responsibility Principle (SRP) - only handles profile deletion
   */
  async deleteProfile(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const { platform, identifier } = req.body;

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

      // Get appropriate business service
      const businessService = this.getBusinessService(marketPlatform);
      
      // Delete business profile
      const result = await businessService.deleteProfile(teamId, marketPlatform);
      
      if (result.success) {
        const response: BusinessProfileResponseDto = {
          success: true,
          timestamp: new Date().toISOString(),
          platform: marketPlatform,
          message: 'Business profile deleted successfully'
        };
        this.sendSuccessResponse(res, 200, response);
      } else {
        this.sendErrorResponse(res, 400, 'Failed to delete business profile');
      }

    } catch (error) {
      this.handleServiceError(error, res, 'delete business profile');
    }
  }

  /**
   * Get appropriate business service for platform
   * Follows Open/Closed Principle (OCP) - easy to extend for new platforms
   */
  private getBusinessService(platform: MarketPlatform): IBusinessService {
    const token = this.getBusinessServiceToken(platform);
    return this.container.getService<IBusinessService>(token);
  }

  /**
   * Get service token for business service based on platform
   * Follows Open/Closed Principle (OCP) - easy to extend for new platforms
   */
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
      case MarketPlatform.TIKTOK:
        return SERVICE_TOKENS.TIKTOK_BUSINESS_SERVICE;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
