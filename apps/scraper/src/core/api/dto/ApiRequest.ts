import { MarketPlatform } from "@prisma/client";

/**
 * Base API Request DTO
 * Follows Single Responsibility Principle (SRP) - defines common request structure
 */
export interface BaseApiRequest {
  teamId: string;
  platform: MarketPlatform;
}

/**
 * Business Profile Request DTO
 * Segregated interface for business profile operations (ISP)
 */
export interface BusinessProfileRequest extends BaseApiRequest {
  locationId: string; // Required: location where this business profile belongs
  identifier: string; // placeId, facebookUrl, tripAdvisorUrl, bookingUrl
  forceRefresh?: boolean;
}

/**
 * Review Request DTO
 * Segregated interface for review operations (ISP)
 */
export interface ReviewRequest extends BaseApiRequest {
  identifier: string;
  forceRefresh?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Analytics Request DTO
 * Segregated interface for analytics operations (ISP)
 */
export interface AnalyticsRequest extends BaseApiRequest {
  identifier: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Task Status Request DTO
 */
export interface TaskStatusRequest {
  teamId: string;
  platform: MarketPlatform;
}

/**
 * Health Check Request DTO
 */
export interface HealthCheckRequest {
  includeServices?: boolean;
}
