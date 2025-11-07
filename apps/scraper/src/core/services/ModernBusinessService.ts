import { MarketPlatform } from "@prisma/client";
import { UnifiedBusinessService } from "./UnifiedBusinessService";
import { IDependencyContainer } from "../interfaces/IDependencyContainer";
import { BusinessProfileResult } from "../interfaces/IBusinessService";
import { ReviewResult } from "../interfaces/IReviewService";
import { AnalyticsResult } from "../interfaces/IAnalyticsService";

/**
 * Modern Business Service
 * Follows Single Responsibility Principle (SRP) - coordinates business operations
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
 * Follows Liskov Substitution Principle (LSP) - can be substituted with any business service
 * Follows Interface Segregation Principle (ISP) - focused interface
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
export class ModernBusinessService {
  private unifiedBusinessService: UnifiedBusinessService;

  constructor(
    private container: IDependencyContainer,
    private actorManager: any, // TODO: Define proper interface
    private teamService: any, // TODO: Define proper interface
  ) {
    this.unifiedBusinessService = new UnifiedBusinessService(container);
  }

  /**
   * Complete business setup following SOLID principles
   * Single Responsibility: Only handles business setup coordination
   */
  async setupBusiness(
    teamId: string,
    platform: MarketPlatform,
    identifier: string,
  ): Promise<{ success: boolean; businessId?: string; error?: string }> {
    try {
      console.log(
        `🚀 Starting modern business setup for team ${teamId}, platform ${platform}, identifier ${identifier}`,
      );

      // Step 1: Create business profile
      console.log("🏢 Creating business profile...");
      const profileResult =
        await this.unifiedBusinessService.createBusinessProfile(
          teamId,
          platform,
          identifier,
        );

      if (!profileResult.success) {
        return {
          success: false,
          error: profileResult.error || "Failed to create business profile",
        };
      }

      // Step 2: Trigger review scraping (delegated to actor manager)
      console.log("🔍 Starting review collection...");
      await this.triggerReviewScraping(teamId, platform, identifier);

      // Step 3: Process analytics
      console.log("📊 Processing analytics...");
      const analyticsResult =
        await this.unifiedBusinessService.processBusinessAnalytics(
          profileResult.businessId!,
          platform,
        );

      if (!analyticsResult.success) {
        console.warn("⚠️ Analytics processing failed:", analyticsResult.error);
      }

      console.log(`✅ Modern business setup completed for team ${teamId}`);

      return {
        success: true,
        businessId: profileResult.businessId,
      };
    } catch (error) {
      console.error("❌ Business setup failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create or update business profile
   * Follows Single Responsibility Principle
   */
  async createOrUpdateProfile(
    teamId: string,
    platform: MarketPlatform,
    identifier: string,
  ): Promise<BusinessProfileResult> {
    return await this.unifiedBusinessService.createBusinessProfile(
      teamId,
      platform,
      identifier,
    );
  }

  /**
   * Get business profile
   */
  async getProfile(
    teamId: string,
    platform: MarketPlatform,
  ): Promise<BusinessProfileResult> {
    return await this.unifiedBusinessService.getBusinessProfile(
      teamId,
      platform,
    );
  }

  /**
   * Save reviews for business
   */
  async saveReviews(
    businessId: string,
    platform: MarketPlatform,
    reviews: any[],
  ): Promise<ReviewResult> {
    return await this.unifiedBusinessService.saveBusinessReviews(
      businessId,
      platform,
      reviews,
    );
  }

  /**
   * Process analytics for business
   */
  async processAnalytics(
    businessId: string,
    platform: MarketPlatform,
  ): Promise<AnalyticsResult> {
    return await this.unifiedBusinessService.processBusinessAnalytics(
      businessId,
      platform,
    );
  }

  /**
   * Trigger review scraping using actor manager
   * Follows Dependency Inversion Principle - depends on abstraction
   */
  private async triggerReviewScraping(
    teamId: string,
    platform: MarketPlatform,
    identifier: string,
  ): Promise<void> {
    // This would delegate to the actor manager
    // The actor manager is injected as a dependency
    console.log(
      `🎬 Triggering review scraping for ${platform} business ${identifier}`,
    );

    // TODO: Implement actual actor triggering
    // await this.actorManager.triggerReviewScraping(teamId, platform, identifier);
  }
}
