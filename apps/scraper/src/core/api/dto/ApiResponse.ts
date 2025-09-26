import { MarketPlatform } from '@prisma/client';

/**
 * Base API Response DTO
 * Follows Single Responsibility Principle (SRP) - defines common response structure
 */
export interface BaseApiResponse {
  success: boolean;
  timestamp: string;
  platform?: MarketPlatform;
  error?: string;
}

/**
 * Business Profile Response DTO
 * Segregated interface for business profile responses (ISP)
 */
export interface BusinessProfileResponse extends BaseApiResponse {
  businessId?: string;
  profile?: any;
  message?: string;
}

/**
 * Review Response DTO
 * Segregated interface for review responses (ISP)
 */
export interface ReviewResponse extends BaseApiResponse {
  jobId?: string;
  reviewsCount?: number;
  reviews?: any[];
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  message?: string;
}

/**
 * Analytics Response DTO
 * Segregated interface for analytics responses (ISP)
 */
export interface AnalyticsResponse extends BaseApiResponse {
  data?: any;
  analytics?: {
    totalReviews: number;
    averageRating: number;
    sentimentScore: number;
    lastUpdated: Date;
  };
  message?: string;
}

/**
 * Task Status Response DTO
 */
export interface TaskStatusResponse extends BaseApiResponse {
  task?: any;
  recentMessages?: any[];
  status?: string;
}

/**
 * Health Check Response DTO
 */
export interface HealthCheckResponse extends BaseApiResponse {
  status: 'healthy' | 'starting' | 'error';
  uptime: number;
  environment: string;
  port: number;
  services?: Record<string, string>;
  message?: string;
}

/**
 * Error Response DTO
 */
export interface ErrorResponse extends BaseApiResponse {
  error: string;
  details?: string;
  code?: string;
}
