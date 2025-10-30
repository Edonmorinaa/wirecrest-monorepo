import type { Request, Response } from 'express';
import type { IApiController } from '../interfaces/IApiController';
import type { BaseApiResponse, ErrorResponse } from '../dto/ApiResponse';
import type { MarketPlatform } from '@prisma/client';

/**
 * Base API Controller
 * Follows Single Responsibility Principle (SRP) - handles common API operations
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
export abstract class BaseApiController implements IApiController {
  /**
   * Handle the main request - to be implemented by subclasses
   */
  abstract handleRequest(req: Request, res: Response): Promise<void>;

  /**
   * Validate required fields in request body
   * Follows Single Responsibility Principle (SRP) - only handles validation
   */
  protected validateRequiredFields(req: Request, requiredFields: string[]): string | null {
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return `Missing required fields: ${missingFields.join(', ')}`;
    }
    
    return null;
  }

  /**
   * Validate platform parameter
   * Follows Single Responsibility Principle (SRP) - only handles platform validation
   */
  protected validatePlatform(platform: string): MarketPlatform | null {
    const validPlatforms = Object.values(MarketPlatform);
    const upperPlatform = platform.toUpperCase();
    
    if (validPlatforms.includes(upperPlatform as MarketPlatform)) {
      return upperPlatform as MarketPlatform;
    }
    
    return null;
  }

  /**
   * Send success response
   * Follows Single Responsibility Principle (SRP) - only handles success responses
   */
  protected sendSuccessResponse<T extends BaseApiResponse>(
    res: Response, 
    statusCode: number, 
    data: T
  ): void {
    res.status(statusCode).json({
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send error response
   * Follows Single Responsibility Principle (SRP) - only handles error responses
   */
  protected sendErrorResponse(
    res: Response, 
    statusCode: number, 
    error: string, 
    details?: string
  ): void {
    const errorResponse: ErrorResponse = {
      success: false,
      timestamp: new Date().toISOString(),
      error,
      details
    };
    
    res.status(statusCode).json(errorResponse);
  }

  /**
   * Handle service errors
   * Follows Single Responsibility Principle (SRP) - only handles service error processing
   */
  protected handleServiceError(error: unknown, res: Response, operation: string): void {
    console.error(`Error in ${operation}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.sendErrorResponse(res, 500, `Failed to ${operation}`, errorMessage);
  }

  /**
   * Extract pagination parameters
   * Follows Single Responsibility Principle (SRP) - only handles pagination extraction
   */
  protected extractPaginationParams(req: Request): { limit: number; offset: number } {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    return { limit, offset };
  }

  /**
   * Validate team ID format
   * Follows Single Responsibility Principle (SRP) - only handles team ID validation
   */
  protected validateTeamId(teamId: string): boolean {
    // Basic UUID validation - can be enhanced
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(teamId);
  }
}
