
import type { Request, Response } from "express";
import { TikTokDataService } from "../services/tiktokDataService.js";

export class TikTokController {
  private tiktokService: TikTokDataService;

  constructor(tiktokService: TikTokDataService) {
    this.tiktokService = tiktokService;
  }

  /**
   * Trigger an immediate snapshot for a TikTok business profile
   * POST /api/tiktok/snapshots
   */
  async triggerSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const {
        locationId,
        tiktokUsername,
        includeVideos = false,
        maxVideos = 10,
        includeComments = false,
        maxComments = 50,
      } = req.body;

      if (!locationId || !tiktokUsername) {
        res.status(400).json({
          error:
            "Missing required parameters: locationId and tiktokUsername are required",
        });
        return;
      }

      console.log("[TikTokController] Trigger snapshot request:", {
        locationId,
        tiktokUsername,
      });

      // Note: TikTok data service uses legacy Supabase and is currently disabled
      // Return a service unavailable error
      res.status(503).json({
        error: "TikTok snapshot service is currently unavailable (legacy Supabase dependency)",
        message: "TikTok integration is being migrated to the new database system",
      });
      return;

      // Original implementation (commented out until Supabase migration is complete):
      /*
      // Check if business profile exists, create if not
      const profileResult =
        await this.tiktokDataService.getBusinessProfileByLocationId(locationId);
 
      let businessProfileId: string;
 
      if (!profileResult.success || !profileResult.profile) {
        // Create new profile
        const createResult =
          await this.tiktokDataService.createBusinessProfile(
            locationId,
            tiktokUsername,
          );
 
        if (!createResult.success) {
          console.error(
            "[TikTokController] Failed to create business profile:",
            createResult.error,
          );
          res.status(500).json({
            error: "Failed to create TikTok business profile",
            details: createResult.error,
          });
          return;
        }
 
        businessProfileId = createResult.businessProfileId!;
      } else {
        businessProfileId = profileResult.profile.id;
      }
 
      // Trigger snapshot
      const snapshotResult = await this.tiktokDataService.takeDailySnapshot(
        businessProfileId,
        {
          snapshotType: "MANUAL",
          includeVideos,
          maxVideos,
          includeComments,
          maxComments,
        },
      );
 
      if (!snapshotResult.success) {
        console.error(
          "[TikTokController] Failed to take snapshot:",
          snapshotResult.error,
        );
        res.status(500).json({
          error: "Failed to take TikTok snapshot",
          details: snapshotResult.error,
        });
        return;
      }
 
      console.log("[TikTokController] Snapshot created successfully:", {
        snapshotId: snapshotResult.snapshotId,
      });
 
      res.status(200).json({
        success: true,
        snapshotId: snapshotResult.snapshotId,
        message: "TikTok snapshot triggered successfully",
      });
      */
    } catch (error) {
      console.error("[TikTokController] Error in triggerSnapshot:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
