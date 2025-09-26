import { MarketPlatform } from '@prisma/client';
import { IReviewService, ReviewResult } from '../interfaces/IReviewService';
import { IReviewRepository } from '../interfaces/IReviewRepository';
import { TikTokDataService } from '../../services/tiktokDataService';

/**
 * TikTok Review Service (for snapshots)
 * Follows Single Responsibility Principle (SRP) - only handles TikTok snapshot operations
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
export class TikTokReviewService implements IReviewService<any> {
  private tiktokDataService: TikTokDataService;

  constructor(private reviewRepository: IReviewRepository) {
    const lamatokAccessKey = process.env.LAMATOK_ACCESS_KEY;
    if (!lamatokAccessKey) {
      throw new Error('LAMATOK_ACCESS_KEY environment variable is required');
    }
    this.tiktokDataService = new TikTokDataService(lamatokAccessKey);
  }

  /**
   * Trigger TikTok snapshot scraping
   */
  async triggerReviewScraping(
    teamId: string,
    platform: MarketPlatform,
    identifier: string
  ): Promise<ReviewResult> {
    try {
      console.log(`[TikTokReviewService] Triggering snapshot for team ${teamId}, username: ${identifier}`);

      // Take snapshot using TikTokDataService
      const result = await this.tiktokDataService.takeSnapshot({
        teamId,
        tiktokUsername: identifier,
        forceRefresh: true
      });
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to take TikTok snapshot'
        };
      }

      return {
        success: true,
        jobId: result.snapshotId || 'unknown',
        reviewsCount: result.snapshotsProcessed || 0,
        message: result.message || 'TikTok snapshot completed successfully'
      };

    } catch (error) {
      console.error('[TikTokReviewService] Error triggering snapshot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get TikTok snapshots
   */
  async getReviews(teamId: string, platform: MarketPlatform): Promise<any[]> {
    try {
      console.log(`[TikTokReviewService] Getting snapshots for team ${teamId}`);

      // Get snapshots from repository
      const snapshots = await this.reviewRepository.getByTeamId(teamId, platform);
      
      return snapshots || [];

    } catch (error) {
      console.error('[TikTokReviewService] Error getting snapshots:', error);
      return [];
    }
  }

  /**
   * Get review count
   */
  async getReviewCount(businessId: string): Promise<number> {
    try {
      console.log(`[TikTokReviewService] Getting snapshot count for business ${businessId}`);

      // Get snapshot count from repository
      const count = await this.reviewRepository.getCount(businessId);
      
      return count || 0;

    } catch (error) {
      console.error('[TikTokReviewService] Error getting snapshot count:', error);
      return 0;
    }
  }
}
