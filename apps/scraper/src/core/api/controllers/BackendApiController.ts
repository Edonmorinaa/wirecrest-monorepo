import { Request, Response } from "express";
import { BaseApiController } from "./BaseApiController";
import { BackendOrchestrator } from "../../services/BackendOrchestrator";
import { IDependencyContainer } from "../../interfaces/IDependencyContainer";
import { MarketPlatform } from "@prisma/client";
import { SERVICE_TOKENS } from "../../interfaces/IDependencyContainer";
import { logger } from "../../../utils/logger";

/**
 * Backend API Controller
 * Follows Single Responsibility Principle (SRP) - handles main backend operations
 * Follows Open/Closed Principle (OCP) - can be extended without modification
 */
export class BackendApiController extends BaseApiController {
  private container: IDependencyContainer;

  constructor(container: IDependencyContainer) {
    super();
    this.container = container;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const { teamId, platform } = req.params;
    const action = req.query.action as string;

    if (!teamId || !platform) {
      this.sendErrorResponse(res, 400, "teamId and platform are required");
      return;
    }

    const validatedPlatform = this.validatePlatform(platform);
    if (!validatedPlatform) {
      this.sendErrorResponse(res, 400, "Invalid platform");
      return;
    }

    try {
      switch (action) {
        case "process":
          await this.processBusinessData(req, res);
          break;
        case "get":
          await this.getBusinessData(req, res);
          break;
        case "refresh":
          await this.refreshBusinessData(req, res);
          break;
        case "batch":
          await this.processBatchData(req, res);
          break;
        default:
          this.sendErrorResponse(
            res,
            400,
            "Invalid action. Supported actions: process, get, refresh, batch",
          );
      }
    } catch (error) {
      this.handleServiceError(error, res, "Backend operation");
    }
  }

  /**
   * Process business data (main function)
   * POST /api/backend/:teamId/:platform?action=process
   */
  async processBusinessData(req: Request, res: Response): Promise<void> {
    const { teamId, platform } = req.params;
    const { identifier, isInitialization, maxReviews, forceRefresh } = req.body;

    if (!identifier) {
      this.sendErrorResponse(res, 400, "identifier is required");
      return;
    }

    const orchestrator = this.getBackendOrchestrator();

    try {
      const result = await orchestrator.processBusinessData(
        teamId,
        platform as MarketPlatform,
        identifier,
        {
          isInitialization: isInitialization || false,
          maxReviews: maxReviews || undefined,
          forceRefresh: forceRefresh || false,
        },
      );

      if (result.success) {
        this.sendSuccessResponse(res, 200, {
          success: true,
          timestamp: new Date().toISOString(),
          platform: platform as MarketPlatform,
          businessId: result.businessId,
          reviewsProcessed: result.reviewsProcessed,
          analyticsGenerated: result.analyticsGenerated,
          message: "Business data processed successfully",
        });
      } else {
        this.sendErrorResponse(
          res,
          400,
          result.error || "Failed to process business data",
        );
      }
    } catch (error) {
      this.handleServiceError(error, res, "Business data processing");
    }
  }

  /**
   * Get business data with reviews and analytics
   * GET /api/backend/:teamId/:platform?action=get
   */
  async getBusinessData(req: Request, res: Response): Promise<void> {
    const { teamId, platform } = req.params;

    const orchestrator = this.getBackendOrchestrator();

    try {
      const result = await orchestrator.getBusinessData(
        teamId,
        platform as MarketPlatform,
      );

      if (result.success) {
        this.sendSuccessResponse(res, 200, {
          success: true,
          timestamp: new Date().toISOString(),
          platform: platform as MarketPlatform,
          businessProfile: result.businessProfile,
          reviews: result.reviews,
          analytics: result.analytics,
          message: "Business data retrieved successfully",
        });
      } else {
        this.sendErrorResponse(
          res,
          404,
          result.error || "Business data not found",
        );
      }
    } catch (error) {
      this.handleServiceError(error, res, "Business data retrieval");
    }
  }

  /**
   * Refresh business data (re-scrape and update)
   * PUT /api/backend/:teamId/:platform?action=refresh
   */
  async refreshBusinessData(req: Request, res: Response): Promise<void> {
    const { teamId, platform } = req.params;
    const { maxReviews, forceRefresh } = req.body;

    const orchestrator = this.getBackendOrchestrator();

    try {
      const result = await orchestrator.refreshBusinessData(
        teamId,
        platform as MarketPlatform,
        {
          maxReviews: maxReviews || undefined,
          forceRefresh: forceRefresh || true,
        },
      );

      if (result.success) {
        this.sendSuccessResponse(res, 200, {
          success: true,
          timestamp: new Date().toISOString(),
          platform: platform as MarketPlatform,
          reviewsProcessed: result.reviewsProcessed,
          analyticsUpdated: result.analyticsUpdated,
          message: "Business data refreshed successfully",
        });
      } else {
        this.sendErrorResponse(
          res,
          400,
          result.error || "Failed to refresh business data",
        );
      }
    } catch (error) {
      this.handleServiceError(error, res, "Business data refresh");
    }
  }

  /**
   * Process batch business data
   * POST /api/backend/batch
   */
  async processBatchData(req: Request, res: Response): Promise<void> {
    const { businesses } = req.body;

    if (!businesses || !Array.isArray(businesses)) {
      this.sendErrorResponse(res, 400, "businesses array is required");
      return;
    }

    // Validate each business object
    for (const business of businesses) {
      if (!business.teamId || !business.platform || !business.identifier) {
        this.sendErrorResponse(
          res,
          400,
          "Each business must have teamId, platform, and identifier",
        );
        return;
      }

      if (!this.validatePlatform(business.platform)) {
        this.sendErrorResponse(
          res,
          400,
          `Invalid platform: ${business.platform}`,
        );
        return;
      }
    }

    const orchestrator = this.getBackendOrchestrator();

    try {
      const results = await orchestrator.processBatchBusinessData(businesses);

      this.sendSuccessResponse(res, 200, {
        success: true,
        timestamp: new Date().toISOString(),
        results,
        totalProcessed: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        message: "Batch processing completed",
      });
    } catch (error) {
      this.handleServiceError(error, res, "Batch processing");
    }
  }

  private getBackendOrchestrator(): BackendOrchestrator {
    return this.container.getService<BackendOrchestrator>(
      SERVICE_TOKENS.BACKEND_ORCHESTRATOR,
    );
  }
}
