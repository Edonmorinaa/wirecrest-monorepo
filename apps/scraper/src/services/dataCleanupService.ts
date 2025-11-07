/**
 * LEGACY FILE - For reference only
 * Supabase has been removed. This service is deprecated.
 */

import { MarketPlatform } from "@prisma/client";
import { marketIdentifierEvents } from "../events/marketIdentifierEvents";

export class DataCleanupService {
  private supabase: any; // LEGACY: Supabase removed

  constructor() {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Clean up all data for a team and platform when market identifier changes
   */
  async cleanupTeamPlatformData(
    teamId: string,
    platform: MarketPlatform,
    oldIdentifier: string,
  ): Promise<{
    businessProfiles: number;
    reviews: number;
    overviews: number;
  }> {
    try {
      console.log(
        `[CLEANUP] Starting cleanup for team ${teamId}, platform ${platform}, identifier: ${oldIdentifier}`,
      );

      let deletedCounts = {
        businessProfiles: 0,
        reviews: 0,
        overviews: 0,
      };

      if (platform === MarketPlatform.GOOGLE_MAPS) {
        deletedCounts = await this.cleanupGoogleData(teamId, oldIdentifier);
      } else if (platform === MarketPlatform.FACEBOOK) {
        deletedCounts = await this.cleanupFacebookData(teamId, oldIdentifier);
      }

      console.log(
        `[CLEANUP] Cleanup completed. Deleted: ${deletedCounts.businessProfiles} profiles, ${deletedCounts.reviews} reviews, ${deletedCounts.overviews} overviews`,
      );

      // Emit cleanup completion event
      marketIdentifierEvents.emitDataCleanup({
        teamId,
        platform,
        oldIdentifier,
        status: "completed",
        timestamp: new Date(),
        deletedRecords: deletedCounts,
      });

      return deletedCounts;
    } catch (error) {
      console.error(`[CLEANUP] Cleanup failed for ${oldIdentifier}:`, error);

      // Emit cleanup failure event
      marketIdentifierEvents.emitDataCleanup({
        teamId,
        platform,
        oldIdentifier,
        status: "error",
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Clean up Google Maps related data
   */
  private async cleanupGoogleData(
    teamId: string,
    placeId: string,
  ): Promise<{ businessProfiles: number; reviews: number; overviews: number }> {
    try {
      // Get business profile IDs to clean up
      const { data: businessProfiles, error: businessError } =
        await this.supabase
          .from("GoogleBusinessProfile")
          .select("id, title")
          .eq("teamId", teamId)
          .eq("placeId", placeId);

      if (businessError) {
        console.error(
          `[CLEANUP] Error getting Google business profiles:`,
          businessError,
        );
        return { businessProfiles: 0, reviews: 0, overviews: 0 };
      }

      if (!businessProfiles || businessProfiles.length === 0) {
        console.log(`[CLEANUP] No Google business profiles found for cleanup`);
        return { businessProfiles: 0, reviews: 0, overviews: 0 };
      }

      const businessProfileIds = businessProfiles.map((profile) => profile.id);
      console.log(
        `[CLEANUP] Found ${businessProfiles.length} Google business profiles to cleanup for placeId: ${placeId}`,
      );
      console.log(
        `[CLEANUP] Profile details:`,
        businessProfiles.map((p) => ({ id: p.id, title: p.title })),
      );

      // Delete reviews
      const { error: reviewsError, count: reviewsCount } = await this.supabase
        .from("GoogleReview")
        .delete({ count: "exact" })
        .in("businessProfileId", businessProfileIds);

      if (reviewsError) {
        console.error(`[CLEANUP] Error deleting Google reviews:`, reviewsError);
      } else {
        console.log(`[CLEANUP] Deleted ${reviewsCount || 0} Google reviews`);
      }

      // Delete overviews
      const { error: overviewsError, count: overviewsCount } =
        await this.supabase
          .from("GoogleOverview")
          .delete({ count: "exact" })
          .in("businessProfileId", businessProfileIds);

      if (overviewsError) {
        console.error(
          `[CLEANUP] Error deleting Google overviews:`,
          overviewsError,
        );
      } else {
        console.log(
          `[CLEANUP] Deleted ${overviewsCount || 0} Google overviews`,
        );
      }

      // Delete business metadata
      const { error: metadataError } = await this.supabase
        .from("GoogleBusinessMetadata")
        .delete()
        .in("businessProfileId", businessProfileIds);

      if (metadataError) {
        console.error(
          `[CLEANUP] Error deleting Google business metadata:`,
          metadataError,
        );
      } else {
        console.log(`[CLEANUP] Deleted Google business metadata records`);
      }

      // Delete business profiles
      const { error: profilesError, count: profilesCount } = await this.supabase
        .from("GoogleBusinessProfile")
        .delete({ count: "exact" })
        .eq("teamId", teamId)
        .eq("placeId", placeId);

      if (profilesError) {
        console.error(
          `[CLEANUP] Error deleting Google business profiles:`,
          profilesError,
        );
      } else {
        console.log(
          `[CLEANUP] Deleted ${profilesCount || 0} Google business profiles`,
        );
      }

      return {
        businessProfiles: profilesCount || 0,
        reviews: reviewsCount || 0,
        overviews: overviewsCount || 0,
      };
    } catch (error) {
      console.error(`[CLEANUP] Error in Google data cleanup:`, error);
      throw error;
    }
  }

  /**
   * Clean up Facebook related data
   */
  private async cleanupFacebookData(
    teamId: string,
    facebookUrl: string,
  ): Promise<{ businessProfiles: number; reviews: number; overviews: number }> {
    try {
      // Get business profile IDs to clean up
      const { data: businessProfiles, error: businessError } =
        await this.supabase
          .from("FacebookBusinessProfile")
          .select("id, title")
          .eq("teamId", teamId)
          .eq("facebookUrl", facebookUrl);

      if (businessError) {
        console.error(
          `[CLEANUP] Error getting Facebook business profiles:`,
          businessError,
        );
        return { businessProfiles: 0, reviews: 0, overviews: 0 };
      }

      if (!businessProfiles || businessProfiles.length === 0) {
        console.log(
          `[CLEANUP] No Facebook business profiles found for cleanup`,
        );
        return { businessProfiles: 0, reviews: 0, overviews: 0 };
      }

      const businessProfileIds = businessProfiles.map((profile) => profile.id);
      console.log(
        `[CLEANUP] Found ${businessProfiles.length} Facebook business profiles to cleanup`,
      );

      // Delete Facebook reviews
      const { error: reviewsError, count: reviewsCount } = await this.supabase
        .from("FacebookReview")
        .delete({ count: "exact" })
        .in("businessProfileId", businessProfileIds);

      if (reviewsError) {
        console.error(
          `[CLEANUP] Error deleting Facebook reviews:`,
          reviewsError,
        );
      } else {
        console.log(`[CLEANUP] Deleted ${reviewsCount || 0} Facebook reviews`);
      }

      // Delete overviews
      const { error: overviewsError, count: overviewsCount } =
        await this.supabase
          .from("FacebookOverview")
          .delete({ count: "exact" })
          .in("businessProfileId", businessProfileIds);

      if (overviewsError) {
        console.error(
          `[CLEANUP] Error deleting Facebook overviews:`,
          overviewsError,
        );
      } else {
        console.log(
          `[CLEANUP] Deleted ${overviewsCount || 0} Facebook overviews`,
        );
      }

      // Delete business metadata
      const { error: metadataError } = await this.supabase
        .from("FacebookBusinessMetadata")
        .delete()
        .in("businessProfileId", businessProfileIds);

      if (metadataError) {
        console.error(
          `[CLEANUP] Error deleting Facebook business metadata:`,
          metadataError,
        );
      } else {
        console.log(`[CLEANUP] Deleted Facebook business metadata records`);
      }

      // Delete business profiles
      const { error: profilesError, count: profilesCount } = await this.supabase
        .from("FacebookBusinessProfile")
        .delete({ count: "exact" })
        .eq("teamId", teamId)
        .eq("facebookUrl", facebookUrl);

      if (profilesError) {
        console.error(
          `[CLEANUP] Error deleting Facebook business profiles:`,
          profilesError,
        );
      } else {
        console.log(
          `[CLEANUP] Deleted ${profilesCount || 0} Facebook business profiles`,
        );
      }

      return {
        businessProfiles: profilesCount || 0,
        reviews: reviewsCount || 0,
        overviews: overviewsCount || 0,
      };
    } catch (error) {
      console.error(`[CLEANUP] Error in Facebook data cleanup:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    // Supabase client doesn't need explicit closing
  }
}
