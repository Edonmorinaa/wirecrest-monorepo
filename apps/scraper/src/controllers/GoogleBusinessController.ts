/**
 * Google Business Controller
 *
 * Handles Google Business Profile creation/deletion and syncs with global schedules.
 * When a user creates a Google business profile, this controller:
 * 1. Creates the GoogleBusinessProfile record
 * 2. Determines the team's update interval
 * 3. Adds the business to the appropriate global schedule
 */

import { Request, Response } from "express";
import { prisma } from "@wirecrest/db";
import { GlobalScheduleOrchestrator } from "../services/subscription/GlobalScheduleOrchestrator";
import { FeatureExtractor } from "../services/subscription/FeatureExtractor";

export class GoogleBusinessController {
  private globalOrchestrator: GlobalScheduleOrchestrator;
  private featureExtractor: FeatureExtractor;

  constructor(apifyToken: string, webhookBaseUrl: string) {
    this.globalOrchestrator = new GlobalScheduleOrchestrator(
      apifyToken,
      webhookBaseUrl,
    );
    this.featureExtractor = new FeatureExtractor();
  }

  /**
   * Create Google Business Profile
   * POST /api/google/profile
   */
  async createProfile(req: Request, res: Response): Promise<void> {
    try {
      const { teamId, placeId } = req.body;

      if (!teamId || !placeId) {
        res.status(400).json({ error: "teamId and placeId are required" });
        return;
      }

      // Check if profile already exists
      const existingProfile = await prisma.googleBusinessProfile.findFirst({
        where: { teamId },
      });

      if (existingProfile && existingProfile.placeId === placeId) {
        res.json({
          success: true,
          profile: existingProfile,
          message: "Profile already exists",
        });
        return;
      }

      // Create or update profile
      const profile = await prisma.googleBusinessProfile.upsert({
        where: { teamId },
        create: {
          teamId,
          placeId,
        },
        update: {
          placeId,
        },
      });

      // Get team's interval (checks custom intervals first, then tier)
      const interval = await this.featureExtractor.getIntervalForTeamPlatform(
        teamId,
        "google_reviews",
        "reviews",
      );

      // Add business to global schedules
      const result = await this.globalOrchestrator.addBusinessToSchedule(
        profile.id,
        teamId,
        "google_reviews",
        placeId,
        interval,
      );

      if (!result.success) {
        console.error("Failed to add business to schedule:", result.message);
        // Don't fail the request, profile is still created
      }

      console.log(
        `✓ Created Google Business Profile for team ${teamId} with placeId ${placeId}`,
      );

      res.json({
        success: true,
        profile,
        scheduleResult: result,
        message: "Google Business Profile created successfully",
      });
    } catch (error: any) {
      console.error("Error creating Google Business Profile:", error);
      res.status(500).json({
        error: "Failed to create Google Business Profile",
        details: error.message,
      });
    }
  }

  /**
   * Delete Google Business Profile
   * DELETE /api/google/profile/:id
   */
  async deleteProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Get profile
      const profile = await prisma.googleBusinessProfile.findUnique({
        where: { id },
      });

      if (!profile) {
        res.status(404).json({ error: "Profile not found" });
        return;
      }

      // Remove from global schedule
      const result = await this.globalOrchestrator.removeBusinessFromSchedule(
        profile.id,
        "google_reviews",
      );

      if (!result.success) {
        console.error(
          "Failed to remove business from schedule:",
          result.message,
        );
      }

      // Delete profile
      await prisma.googleBusinessProfile.delete({
        where: { id },
      });

      console.log(`✓ Deleted Google Business Profile ${id}`);

      res.json({
        success: true,
        message: "Google Business Profile deleted successfully",
        scheduleResult: result,
      });
    } catch (error: any) {
      console.error("Error deleting Google Business Profile:", error);
      res.status(500).json({
        error: "Failed to delete Google Business Profile",
        details: error.message,
      });
    }
  }

  /**
   * Get Google Business Profile
   * GET /api/google/profile/:teamId
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;

      const profile = await prisma.googleBusinessProfile.findFirst({
        where: { teamId },
        include: {
          metadata: true,
        },
      });

      if (!profile) {
        res.status(404).json({ error: "Profile not found" });
        return;
      }

      // Get schedule info
      const mapping = await prisma.businessScheduleMapping.findUnique({
        where: {
          businessProfileId_platform: {
            businessProfileId: profile.id,
            platform: "google_reviews",
          },
        },
        include: {
          schedule: true,
        },
      });

      res.json({
        success: true,
        profile,
        scheduleInfo: mapping
          ? {
              intervalHours: mapping.intervalHours,
              scheduleId: mapping.scheduleId,
              isActive: mapping.isActive,
              nextRun: mapping.schedule.nextRunAt,
            }
          : null,
      });
    } catch (error: any) {
      console.error("Error getting Google Business Profile:", error);
      res.status(500).json({
        error: "Failed to get Google Business Profile",
        details: error.message,
      });
    }
  }
}
