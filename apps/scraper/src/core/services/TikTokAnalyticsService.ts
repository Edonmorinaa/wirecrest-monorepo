import type { AnalyticsResult } from "../interfaces/IAnalyticsService.js";
import { TikTokDataService } from "../../services/tiktokDataService.js";

/**
 * TikTok Analytics Service
 * Follows Single Responsibility Principle (SRP) - only handles TikTok analytics operations
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
export class TikTokAnalyticsService {
  private tiktokDataService: TikTokDataService;

  constructor() {
    const lamatokAccessKey = process.env.LAMATOK_ACCESS_KEY;
    if (!lamatokAccessKey) {
      throw new Error("LAMATOK_ACCESS_KEY environment variable is required");
    }
    this.tiktokDataService = new TikTokDataService(lamatokAccessKey);
  }

  /**
   * Get TikTok analytics
   */
  async getAnalytics(identifier: string): Promise<AnalyticsResult> {
    try {
      console.log(
        `[TikTokAnalyticsService] Getting analytics for identifier: ${identifier}`,
      );

      // Resolve business profile ID by location
      const profile =
        await this.tiktokDataService.getBusinessProfileByLocationId(identifier);
      if (!profile.success || !profile.profile?.id) {
        return {
          success: false,
          error: profile.error || "TikTok business profile not found",
        };
      }

      // Get 30-day analytics
      const result = await this.tiktokDataService.getAnalytics(
        profile.profile.id,
        { period: "30" },
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to get TikTok analytics",
        };
      }

      const analyticsData = {
        businessId: profile.profile.id,
        totalReviews: 0,
        averageRating: 0,
        sentimentScore: 0,
        lastUpdated: new Date(),
        platform: "TikTok",
      };

      return { success: true, analyticsData };
    } catch (error) {
      console.error("[TikTokAnalyticsService] Error getting analytics:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Process TikTok analytics
   */
  async processAnalytics(identifier: string): Promise<AnalyticsResult> {
    try {
      console.log(
        `[TikTokAnalyticsService] Processing analytics for identifier: ${identifier}`,
      );

      const profile =
        await this.tiktokDataService.getBusinessProfileByLocationId(identifier);
      if (!profile.success || !profile.profile?.id) {
        return {
          success: false,
          error: profile.error || "TikTok business profile not found",
        };
      }

      // Reuse getAnalytics for 30-day period
      const result = await this.tiktokDataService.getAnalytics(
        profile.profile.id,
        { period: "30" },
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to process TikTok analytics",
        };
      }

      const analyticsData = {
        businessId: profile.profile.id,
        totalReviews: 0,
        averageRating: 0,
        sentimentScore: 0,
        lastUpdated: new Date(),
        platform: "TikTok",
      };

      return { success: true, analyticsData };
    } catch (error) {
      console.error(
        "[TikTokAnalyticsService] Error processing analytics:",
        error,
      );
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
