import { IAnalyticsService, AnalyticsResult } from '../interfaces/IAnalyticsService';
import { IReviewRepository } from '../interfaces/IReviewRepository';
import { TikTokDataService } from '../../services/tiktokDataService';

/**
 * TikTok Analytics Service
 * Follows Single Responsibility Principle (SRP) - only handles TikTok analytics operations
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
export class TikTokAnalyticsService implements IAnalyticsService {
  private tiktokDataService: TikTokDataService;

  constructor(
    private reviewRepository: IReviewRepository,
    private sentimentAnalyzer?: any // TODO: Inject proper sentiment analyzer
  ) {
    const lamatokAccessKey = process.env.LAMATOK_ACCESS_KEY;
    if (!lamatokAccessKey) {
      throw new Error('LAMATOK_ACCESS_KEY environment variable is required');
    }
    this.tiktokDataService = new TikTokDataService(lamatokAccessKey);
  }

  /**
   * Get TikTok analytics
   */
  async getAnalytics(identifier: string): Promise<AnalyticsResult> {
    try {
      console.log(`[TikTokAnalyticsService] Getting analytics for identifier: ${identifier}`);

      // Get analytics using TikTokDataService
      const result = await this.tiktokDataService.getAnalytics({
        teamId: identifier, // Assuming identifier is teamId
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: new Date()
      });
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to get TikTok analytics'
        };
      }

      return {
        success: true,
        data: result.data || {},
        message: 'TikTok analytics retrieved successfully'
      };

    } catch (error) {
      console.error('[TikTokAnalyticsService] Error getting analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Process TikTok analytics
   */
  async processAnalytics(identifier: string): Promise<AnalyticsResult> {
    try {
      console.log(`[TikTokAnalyticsService] Processing analytics for identifier: ${identifier}`);

      // Process analytics using TikTokDataService
      const result = await this.tiktokDataService.getAnalytics({
        teamId: identifier, // Assuming identifier is teamId
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: new Date()
      });
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to process TikTok analytics'
        };
      }

      return {
        success: true,
        data: result.data || {},
        message: 'TikTok analytics processed successfully'
      };

    } catch (error) {
      console.error('[TikTokAnalyticsService] Error processing analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
