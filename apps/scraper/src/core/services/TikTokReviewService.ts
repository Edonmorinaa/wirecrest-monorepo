import { MarketPlatform } from '@prisma/client';
import { ReviewResult } from '../interfaces/IReviewService';
import { TikTokDataService } from '../../services/tiktokDataService';

/**
 * TikTok Review Service (for snapshots)
 * Follows Single Responsibility Principle (SRP) - only handles TikTok snapshot operations
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
import type { TikTokSnapshot } from '../repositories/TikTokReviewRepository';

export interface ITikTokReviewRepository {
  getByTeamId(teamId: string, platform: MarketPlatform): Promise<TikTokSnapshot[]>;
  getCount(businessId: string): Promise<number>;
}

export class TikTokReviewService {
  private tiktokDataService: TikTokDataService;
  private reviewRepository: ITikTokReviewRepository;

  constructor(reviewRepository: ITikTokReviewRepository) {
    this.reviewRepository = reviewRepository;
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

      // Ensure business profile exists and get ID
      let businessProfileId: string | null = null;
      const profileResult = await this.tiktokDataService.getBusinessProfileByTeamId(teamId);
      if (profileResult.success && profileResult.profile?.id) {
        businessProfileId = profileResult.profile.id;
      } else {
        const createResult = await this.tiktokDataService.createBusinessProfile(teamId, identifier);
        if (!createResult.success || !createResult.businessProfileId) {
          return { success: false, error: createResult.error || 'Failed to prepare TikTok profile' };
        }
        businessProfileId = createResult.businessProfileId;
      }

      // Take snapshot using TikTokDataService
      const result = await this.tiktokDataService.takeDailySnapshot(businessProfileId!, {
        snapshotType: 'MANUAL',
      });
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to take TikTok snapshot'
        };
      }

      return {
        success: true,
        reviewsCount: 0,
        message: 'TikTok snapshot completed successfully',
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
  async getReviews(teamId: string, platform: MarketPlatform): Promise<TikTokSnapshot[]> {
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
