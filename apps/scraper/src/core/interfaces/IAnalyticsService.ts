/**
 * Analytics service interface
 * Defines contract for analytics operations (ISP)
 */
export interface IAnalyticsService {
  processReviews(businessId: string): Promise<AnalyticsResult>;
  getAnalytics(businessId: string): Promise<AnalyticsData | null>;
  updateAnalytics(businessId: string, data: AnalyticsData): Promise<void>;
  deleteAnalytics(businessId: string): Promise<void>;
}

export interface AnalyticsResult {
  success: boolean;
  analyticsData?: AnalyticsData;
  error?: string;
}

export interface AnalyticsData {
  businessId: string;
  totalReviews: number;
  averageRating: number;
  sentimentScore: number;
  lastUpdated: Date;
  platform: string;
}
