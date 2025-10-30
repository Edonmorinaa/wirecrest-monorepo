import type { Request, Response } from 'express';

/**
 * Base API Controller Interface
 * Follows Single Responsibility Principle (SRP) - defines contract for API controllers
 * Follows Interface Segregation Principle (ISP) - focused interface for API operations
 */
export interface IApiController {
  handleRequest(req: Request, res: Response): Promise<void>;
}

/**
 * Business API Controller Interface
 * Segregated interface for business-related operations (ISP)
 */
export interface IBusinessApiController extends IApiController {
  createProfile(req: Request, res: Response): Promise<void>;
  getProfile(req: Request, res: Response): Promise<void>;
  updateProfile(req: Request, res: Response): Promise<void>;
  deleteProfile(req: Request, res: Response): Promise<void>;
}

/**
 * Review API Controller Interface
 * Segregated interface for review-related operations (ISP)
 */
export interface IReviewApiController extends IApiController {
  getReviews(req: Request, res: Response): Promise<void>;
  triggerReviewScraping(req: Request, res: Response): Promise<void>;
  getReviewAnalytics(req: Request, res: Response): Promise<void>;
}

/**
 * Analytics API Controller Interface
 * Segregated interface for analytics operations (ISP)
 */
export interface IAnalyticsApiController extends IApiController {
  getAnalytics(req: Request, res: Response): Promise<void>;
  processAnalytics(req: Request, res: Response): Promise<void>;
}
