/**
 * Subscription Orchestrator
 * Orchestrates subscription lifecycle using GLOBAL SCHEDULES
 *
 * This orchestrator now works with the GlobalScheduleOrchestrator to:
 * - Add team's businesses to global interval-based schedules
 * - Move businesses between schedules when tier changes
 * - Remove businesses from schedules when subscription ends
 */

import { prisma } from "@wirecrest/db";
import { MarketPlatform } from "@prisma/client";
import { ApifyTaskService } from "../apify/ApifyTaskService";
import { ApifyDataSyncService } from "../apify/ApifyDataSyncService";
import { FeatureExtractor } from "./FeatureExtractor";
import { GlobalScheduleOrchestrator } from "./GlobalScheduleOrchestrator";
import { BusinessProfileCreationService } from "../businessProfileCreationService";
import type { Platform, TaskRunConfig } from "../../types/apify.types";

export class SubscriptionOrchestrator {
  private taskService: ApifyTaskService;
  private syncService: ApifyDataSyncService;
  private featureExtractor: FeatureExtractor;
  private globalOrchestrator: GlobalScheduleOrchestrator;
  private apifyToken: string;

  constructor(apifyToken: string, webhookBaseUrl: string) {
    this.taskService = new ApifyTaskService(apifyToken, webhookBaseUrl);
    this.syncService = new ApifyDataSyncService(apifyToken);
    this.featureExtractor = new FeatureExtractor();
    this.globalOrchestrator = new GlobalScheduleOrchestrator(
      apifyToken,
      webhookBaseUrl,
    );
    this.apifyToken = apifyToken;
  }

  /**
   * Handle new subscription: trigger initial fetch and add businesses to global schedules
   *
   * NEW APPROACH: Add team's businesses to global interval-based schedules
   */
  async handleNewSubscription(teamId: string): Promise<{
    success: boolean;
    message: string;
    initialTasksStarted: number;
    businessesAdded: number;
    profilesCreated: number;
  }> {
    try {
      console.log(`🆕 Handling new subscription for team ${teamId}`);

      // Extract features and limits
      const features = await this.featureExtractor.extractTeamFeatures(teamId);

      // Get enabled platforms
      const enabledPlatforms =
        await this.featureExtractor.getEnabledPlatforms(teamId);

      if (enabledPlatforms.length === 0) {
        return {
          success: false,
          message: "No platforms enabled in subscription",
          initialTasksStarted: 0,
          businessesAdded: 0,
          profilesCreated: 0,
        };
      }

      // Get business identifiers for all enabled platforms
      const identifiers = await this.getTeamBusinessIdentifiers(
        teamId,
        enabledPlatforms,
      );

      // Initialize profile creation service
      const profileService = new BusinessProfileCreationService(
        this.apifyToken,
      );

      let initialTasksStarted = 0;
      let businessesAdded = 0;
      let profilesCreated = 0;

      // For each enabled platform
      for (const platform of enabledPlatforms) {
        const platformIdentifiers = identifiers[platform as Platform];

        if (!platformIdentifiers || platformIdentifiers.length === 0) {
          console.warn(
            `No business identifiers found for platform: ${platform}`,
          );
          continue;
        }

        console.log(
          `  📍 Processing ${platformIdentifiers.length} ${platform} business(es)`,
        );

        // Ensure profiles exist for all identifiers (create if missing)
        for (const identifier of platformIdentifiers) {
          const profileResult =
            await profileService.ensureBusinessProfileExists(
              teamId,
              this.mapPlatformToMarketPlatform(platform),
              identifier,
            );

          if (!profileResult.exists) {
            console.error(
              `Failed to create profile for ${platform}:${identifier}`,
              profileResult.error,
            );
            continue;
          }

          if (profileResult.created) {
            profilesCreated++;
            console.log(`    ✓ Created business profile for ${identifier}`);
          }
        }

        // Trigger initial data fetch - get ALL reviews for initial sync
        const taskConfig: TaskRunConfig = {
          platform: platform as Platform,
          identifiers: platformIdentifiers,
          isInitial: true,
          maxReviews: 99999, // Unlimited for initial sync - get all historical reviews
          webhookUrl: "",
        };

        const taskResult = await this.taskService.runInitialTask(taskConfig);

        // Create sync record
        await this.syncService.createSyncRecord(
          teamId,
          platform as Platform,
          "initial",
          taskResult.apifyRunId,
        );

        initialTasksStarted++;

        // Get interval for this platform (checks custom intervals first)
        const interval = await this.featureExtractor.getIntervalForTeamPlatform(
          teamId,
          platform as Platform,
          "reviews",
        );

        // Add each business to the appropriate global schedule
        for (const identifier of platformIdentifiers) {
          // Get business profile ID from identifier
          const businessProfileId = await this.getBusinessProfileId(
            teamId,
            platform as Platform,
            identifier,
          );

          if (businessProfileId) {
            const result = await this.globalOrchestrator.addBusinessToSchedule(
              businessProfileId,
              teamId,
              platform as Platform,
              identifier,
              interval,
            );

            if (result.success) {
              businessesAdded++;
              console.log(
                `    ✓ Added ${identifier} to global schedule (${interval}h)`,
              );
            } else {
              console.error(
                `    ✗ Failed to add ${identifier}: ${result.message}`,
              );
            }
          }
        }
      }

      const message = `Started ${initialTasksStarted} tasks, added ${businessesAdded} businesses, created ${profilesCreated} new profiles`;
      console.log(`✅ ${message}`);

      return {
        success: true,
        message,
        initialTasksStarted,
        businessesAdded,
        profilesCreated,
      };
    } catch (error: any) {
      console.error("Error handling new subscription:", error);
      return {
        success: false,
        message: `Failed to setup subscription: ${error.message}`,
        initialTasksStarted: 0,
        businessesAdded: 0,
        profilesCreated: 0,
      };
    }
  }

  /**
   * Handle subscription update: move businesses between global schedules based on new tier
   *
   * NEW APPROACH: Move team's businesses to schedules matching new interval
   */
  async handleSubscriptionUpdate(teamId: string): Promise<{
    success: boolean;
    message: string;
    businessesMoved: number;
  }> {
    try {
      console.log(`🔄 Handling subscription update for team ${teamId}`);

      const enabledPlatforms =
        await this.featureExtractor.getEnabledPlatforms(teamId);
      let businessesMoved = 0;

      // For each enabled platform
      for (const platform of enabledPlatforms) {
        // Get new interval for this platform
        const newInterval =
          await this.featureExtractor.getIntervalForTeamPlatform(
            teamId,
            platform as Platform,
            "reviews",
          );

        // Get all business mappings for this team + platform
        const mappings = await prisma.businessScheduleMapping.findMany({
          where: {
            teamId,
            platform,
            isActive: true,
          },
        });

        console.log(
          `  📍 ${platform}: ${mappings.length} business(es), new interval: ${newInterval}h`,
        );

        // Move each business to new schedule if interval changed
        for (const mapping of mappings) {
          const oldInterval = mapping.intervalHours;

          if (oldInterval !== newInterval) {
            const identifier =
              mapping.placeId ||
              mapping.facebookUrl ||
              mapping.tripAdvisorUrl ||
              mapping.bookingUrl;

            console.log(
              `    🔀 Moving business from ${oldInterval}h → ${newInterval}h`,
            );

            const result =
              await this.globalOrchestrator.moveBusinessBetweenSchedules(
                mapping.businessProfileId,
                platform as Platform,
                oldInterval,
                newInterval,
              );

            if (result.success) {
              businessesMoved++;
              console.log(`    ✓ Moved ${identifier}`);
            } else {
              console.error(
                `    ✗ Failed to move ${identifier}: ${result.message}`,
              );
            }
          } else {
            console.log(
              `    ⏭️  Business already at ${newInterval}h, skipping`,
            );
          }
        }
      }

      const message =
        businessesMoved > 0
          ? `Successfully moved ${businessesMoved} businesses to new intervals`
          : "No businesses needed to be moved";

      console.log(`✅ ${message}`);

      return {
        success: true,
        message,
        businessesMoved,
      };
    } catch (error: any) {
      console.error("Error handling subscription update:", error);
      return {
        success: false,
        message: `Failed to update subscription: ${error.message}`,
        businessesMoved: 0,
      };
    }
  }

  /**
   * Handle subscription cancellation: remove all businesses from global schedules
   *
   * NEW APPROACH: Remove team's businesses from all global schedules
   */
  async handleSubscriptionCancellation(teamId: string): Promise<{
    success: boolean;
    message: string;
    businessesRemoved: number;
  }> {
    try {
      console.log(`🚫 Handling subscription cancellation for team ${teamId}`);

      // Get all business mappings for this team
      const mappings = await prisma.businessScheduleMapping.findMany({
        where: { teamId },
      });

      console.log(`  Found ${mappings.length} businesses to remove`);

      let businessesRemoved = 0;

      // Remove each business from its global schedule
      for (const mapping of mappings) {
        const result = await this.globalOrchestrator.removeBusinessFromSchedule(
          mapping.businessProfileId,
          mapping.platform as Platform,
        );

        if (result.success) {
          businessesRemoved++;
        } else {
          console.error(
            `  ✗ Failed to remove business ${mapping.businessProfileId}: ${result.message}`,
          );
        }
      }

      const message = `Successfully removed ${businessesRemoved} businesses from global schedules`;
      console.log(`✅ ${message}`);

      return {
        success: true,
        message,
        businessesRemoved,
      };
    } catch (error: any) {
      console.error("Error handling subscription cancellation:", error);
      return {
        success: false,
        message: `Failed to cancel subscription: ${error.message}`,
        businessesRemoved: 0,
      };
    }
  }

  /**
   * Handle platform added: trigger initial scrape when platform is configured after subscription
   * This is called when a user adds a platform identifier after already having an active subscription
   */
  async handlePlatformAdded(
    teamId: string,
    platform: Platform,
    identifier: string,
  ): Promise<{
    success: boolean;
    message: string;
    initialTaskStarted: boolean;
    businessAdded: boolean;
  }> {
    try {
      console.log(
        `🆕 Handling platform addition for team ${teamId}, platform: ${platform}, identifier: ${identifier}`,
      );

      // Extract features to get interval
      const features = await this.featureExtractor.extractTeamFeatures(teamId);
      const interval = await this.featureExtractor.getIntervalForTeamPlatform(
        teamId,
        platform,
        "reviews",
      );

      console.log(
        `  📊 Team features: tier=${features.tier}, interval=${interval}h`,
      );

      // Trigger initial data fetch - get ALL reviews for initial sync
      const taskConfig: TaskRunConfig = {
        platform,
        identifiers: [identifier],
        isInitial: true,
        maxReviews: 99999, // Unlimited for initial sync - get all historical reviews
        webhookUrl: "",
      };

      console.log(`  🚀 Starting initial task for ${platform}`);
      const taskResult = await this.taskService.runInitialTask(taskConfig);

      // Create sync record
      await this.syncService.createSyncRecord(
        teamId,
        platform,
        "initial",
        taskResult.apifyRunId,
      );

      console.log(`  ✅ Initial task started: ${taskResult.apifyRunId}`);

      // Get business profile ID and add to schedule
      // Note: Business profile might not exist yet if this is the first time
      // The profile will be created by the Apify actor
      const businessProfileId = await this.getBusinessProfileId(
        teamId,
        platform,
        identifier,
      );

      let businessAdded = false;
      if (businessProfileId) {
        console.log(
          `  📍 Adding business ${businessProfileId} to global schedule (${interval}h)`,
        );

        const result = await this.globalOrchestrator.addBusinessToSchedule(
          businessProfileId,
          teamId,
          platform,
          identifier,
          interval,
        );

        if (result.success) {
          businessAdded = true;
          console.log(`  ✅ Business added to schedule successfully`);
        } else {
          console.error(
            `  ✗ Failed to add business to schedule: ${result.message}`,
          );
        }
      } else {
        console.log(
          `  ⚠️ Business profile not found yet, will be added to schedule after profile creation`,
        );
      }

      return {
        success: true,
        message: "Platform configured and scraping initiated",
        initialTaskStarted: true,
        businessAdded,
      };
    } catch (error: any) {
      console.error("Error handling platform addition:", error);
      return {
        success: false,
        message: `Failed to setup platform: ${error.message}`,
        initialTaskStarted: false,
        businessAdded: false,
      };
    }
  }

  async handlePlatformRemoved(
    teamId: string,
    platform: Platform,
    identifier: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log(
        `🚫 Handling platform removal for team ${teamId}, platform: ${platform}, identifier: ${identifier}`,
      );

      // Remove business from schedule
      const result = await this.globalOrchestrator.removeBusinessFromSchedule(
        identifier,
        platform as Platform,
      );

      if (result.success) {
        return {
          success: true,
          message: "Platform removed successfully",
        };
      } else {
        console.error(
          `  ✗ Failed to remove business ${identifier}: ${result.message}`,
        );
        return {
          success: false,
          message: `Failed to remove business: ${result.message}`,
        };
      }
    } catch (error: any) {
      console.error("Error handling platform removal:", error);
      return {
        success: false,
        message: `Failed to remove business: ${error.message}`,
      };
    }
  }
  /**
   * Get business profile ID from identifier
   * Helper method to look up the business profile ID for a given identifier
   */
  private async getBusinessProfileId(
    teamId: string,
    platform: Platform,
    identifier: string,
  ): Promise<string | null> {
    try {
      switch (platform) {
        case "google_reviews":
          const googleProfile = await prisma.googleBusinessProfile.findFirst({
            where: { teamId, placeId: identifier },
            select: { id: true },
          });
          return googleProfile?.id || null;

        case "facebook":
          const facebookProfile =
            await prisma.facebookBusinessProfile.findFirst({
              where: { teamId, facebookUrl: identifier },
              select: { id: true },
            });
          return facebookProfile?.id || null;

        case "tripadvisor":
          const tripAdvisorProfile =
            await prisma.tripAdvisorBusinessProfile.findFirst({
              where: { teamId, tripAdvisorUrl: identifier },
              select: { id: true },
            });
          return tripAdvisorProfile?.id || null;

        case "booking":
          const bookingProfile = await prisma.bookingBusinessProfile.findFirst({
            where: { teamId, bookingUrl: identifier },
            select: { id: true },
          });
          return bookingProfile?.id || null;

        default:
          return null;
      }
    } catch (error) {
      console.error(
        `Error getting business profile ID for ${platform}:${identifier}`,
        error,
      );
      return null;
    }
  }

  /**
   * Get business identifiers for team across platforms
   * 🔄 FULLY DYNAMIC: Supports multiple businesses per platform
   */
  private async getTeamBusinessIdentifiers(
    teamId: string,
    platforms: string[],
  ): Promise<Record<string, string[]>> {
    const identifiers: Record<string, string[]> = {};

    for (const platform of platforms) {
      switch (platform) {
        case "google_reviews":
          // Get ALL Google business profiles for this team
          const googleProfiles = await prisma.googleBusinessProfile.findMany({
            where: { teamId },
            select: { placeId: true },
          });
          const placeIds = googleProfiles
            .map((p) => p.placeId)
            .filter(Boolean) as string[];
          if (placeIds.length > 0) {
            identifiers["google_reviews"] = placeIds;
          }
          break;

        case "facebook":
          // Get ALL Facebook pages for this team
          const facebookProfiles =
            await prisma.facebookBusinessProfile.findMany({
              where: { teamId },
              select: { facebookUrl: true },
            });
          const facebookUrls = facebookProfiles
            .map((p) => p.facebookUrl)
            .filter(Boolean) as string[];
          if (facebookUrls.length > 0) {
            identifiers["facebook"] = facebookUrls;
          }
          break;

        case "tripadvisor":
          // Get ALL TripAdvisor locations for this team
          const tripAdvisorProfiles =
            await prisma.tripAdvisorBusinessProfile.findMany({
              where: { teamId },
              select: { tripAdvisorUrl: true },
            });
          const tripAdvisorUrls = tripAdvisorProfiles
            .map((p) => p.tripAdvisorUrl)
            .filter(Boolean) as string[];
          if (tripAdvisorUrls.length > 0) {
            identifiers["tripadvisor"] = tripAdvisorUrls;
          }
          break;

        case "booking":
          // Get ALL Booking.com properties for this team
          const bookingProfiles = await prisma.bookingBusinessProfile.findMany({
            where: { teamId },
            select: { bookingUrl: true },
          });
          const bookingUrls = bookingProfiles
            .map((p) => p.bookingUrl)
            .filter(Boolean) as string[];
          if (bookingUrls.length > 0) {
            identifiers["booking"] = bookingUrls;
          }
          break;
      }
    }

    return identifiers;
  }

  /**
   * Map platform string to MarketPlatform enum
   */
  private mapPlatformToMarketPlatform(platform: string): MarketPlatform {
    const mapping: Record<string, MarketPlatform> = {
      google_maps: MarketPlatform.GOOGLE_MAPS,
      google_reviews: MarketPlatform.GOOGLE_MAPS,
      facebook: MarketPlatform.FACEBOOK,
      tripadvisor: MarketPlatform.TRIPADVISOR,
      booking: MarketPlatform.BOOKING,
    };
    return mapping[platform] || MarketPlatform.GOOGLE_MAPS; // Default fallback
  }
}
