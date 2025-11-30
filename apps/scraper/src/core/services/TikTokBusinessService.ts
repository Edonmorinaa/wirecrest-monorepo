import { MarketPlatform } from "@prisma/client";
import type {
  IBusinessService,
  BusinessProfileResult,
} from "../interfaces/IBusinessService.js";
import { TikTokDataService } from "../../services/tiktokDataService.js";

/**
 * TikTok Business Service
 * Follows Single Responsibility Principle (SRP) - only handles TikTok business operations
 * Follows Open/Closed Principle (OCP) - open for extension, closed for modification
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions
 */
export interface ITikTokBusinessRepository {
  getByLocationId(
    locationId: string,
    platform: MarketPlatform,
  ): Promise<{ id: string } | null>;
  create(
    locationId: string,
    platform: MarketPlatform,
    data: { username: string; isActive?: boolean },
  ): Promise<{ id: string }>;
  update(
    locationId: string,
    platform: MarketPlatform,
    data: { username?: string; isActive?: boolean },
  ): Promise<{ id: string }>;
  delete(locationId: string, platform: MarketPlatform): Promise<boolean>;
}

export class TikTokBusinessService {
  private tiktokDataService: TikTokDataService;
  private businessRepository: ITikTokBusinessRepository;

  constructor(businessRepository: ITikTokBusinessRepository) {
    this.businessRepository = businessRepository;
    const lamatokAccessKey = process.env.LAMATOK_ACCESS_KEY;
    if (!lamatokAccessKey) {
      throw new Error("LAMATOK_ACCESS_KEY environment variable is required");
    }
    this.tiktokDataService = new TikTokDataService(lamatokAccessKey);
  }

  /**
   * Create TikTok business profile
   */
  async createProfile(
    locationId: string,
    platform: MarketPlatform,
    identifier: string,
  ): Promise<BusinessProfileResult> {
    try {
      console.log(
        `[TikTokBusinessService] Creating profile for location ${locationId}, username: ${identifier}`,
      );

      // Create business profile using TikTokDataService
      const result = await this.tiktokDataService.createBusinessProfile(
        locationId,
        identifier,
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to create TikTok business profile",
        };
      }

      return {
        success: true,
        businessId: result.businessProfileId!,
        profileData: {
          locationId,
          platform,
          identifier,
          businessProfileId: result.businessProfileId!,
        },
      };
    } catch (error) {
      console.error("[TikTokBusinessService] Error creating profile:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get TikTok business profile
   */
  async getProfile(
    locationId: string,
    platform: MarketPlatform,
  ): Promise<BusinessProfileResult> {
    try {
      console.log(`[TikTokBusinessService] Getting profile for location ${locationId}`);

      // Get business profile from repository
      const profile = await this.businessRepository.getByLocationId(
        locationId,
        platform,
      );

      if (!profile) {
        return {
          success: false,
          error: "TikTok business profile not found",
        };
      }

      return {
        success: true,
        businessId: profile.id,
        profileData: profile,
      };
    } catch (error) {
      console.error("[TikTokBusinessService] Error getting profile:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Update TikTok business profile
   */
  async updateProfile(
    locationId: string,
    platform: MarketPlatform,
    profileData: { username?: string; isActive?: boolean },
  ): Promise<BusinessProfileResult> {
    try {
      console.log(
        `[TikTokBusinessService] Updating profile for location ${locationId}`,
      );

      // Update business profile in repository
      const updatedProfile = await this.businessRepository.update(
        locationId,
        platform,
        profileData,
      );

      if (!updatedProfile) {
        return {
          success: false,
          error: "Failed to update TikTok business profile",
        };
      }

      return {
        success: true,
        businessId: updatedProfile.id,
        profileData: updatedProfile,
      };
    } catch (error) {
      console.error("[TikTokBusinessService] Error updating profile:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Delete TikTok business profile
   */
  async deleteProfile(
    locationId: string,
    platform: MarketPlatform,
  ): Promise<BusinessProfileResult> {
    try {
      console.log(
        `[TikTokBusinessService] Deleting profile for location ${locationId}`,
      );

      // Delete business profile from repository
      const deleted = await this.businessRepository.delete(locationId, platform);

      if (!deleted) {
        return {
          success: false,
          error: "Failed to delete TikTok business profile",
        };
      }

      return {
        success: true,
        businessId: "",
        profileData: null,
      };
    } catch (error) {
      console.error("[TikTokBusinessService] Error deleting profile:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
