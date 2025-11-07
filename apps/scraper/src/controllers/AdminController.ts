/**
 * Admin Controller
 * Provides manual trigger endpoints for admin dashboard
 *
 * SECURITY: These endpoints should be protected by admin authentication!
 */

import type { Request, Response } from "express";
import { prisma } from "@wirecrest/db";
import { SubscriptionOrchestrator } from "../services/subscription/SubscriptionOrchestrator";
import { ApifyScheduleService } from "../services/apify/ApifyScheduleService";
import { ApifyTaskService } from "../services/apify/ApifyTaskService";
import { ApifyDataSyncService } from "../services/apify/ApifyDataSyncService";
import { FeatureExtractor } from "../services/subscription/FeatureExtractor";
import type { Platform } from "../types/apify.types";

export class AdminController {
  private orchestrator: SubscriptionOrchestrator;
  private scheduleService: ApifyScheduleService;
  private taskService: ApifyTaskService;
  private syncService: ApifyDataSyncService;
  private featureExtractor: FeatureExtractor;

  constructor(
    orchestrator: SubscriptionOrchestrator,
    scheduleService: ApifyScheduleService,
    taskService: ApifyTaskService,
    syncService: ApifyDataSyncService,
    featureExtractor: FeatureExtractor,
  ) {
    this.orchestrator = orchestrator;
    this.scheduleService = scheduleService;
    this.taskService = taskService;
    this.syncService = syncService;
    this.featureExtractor = featureExtractor;
  }

  /**
   * Manually trigger full subscription setup for a team
   * POST /api/admin/teams/:teamId/setup
   */
  async triggerSubscriptionSetup(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const { forceReset = false } = req.body;

      console.log(
        `🔧 [ADMIN] Triggering subscription setup for team ${teamId}`,
      );

      // If forceReset, delete existing schedules first
      if (forceReset) {
        console.log("🗑️  [ADMIN] Force reset - deleting existing schedules...");
        await this.scheduleService.deleteTeamSchedules(teamId);
      }

      // Trigger full setup
      const result = await this.orchestrator.handleNewSubscription(teamId);

      res.json({
        success: true,
        message: "Subscription setup triggered",
        teamId,
        forceReset,
        result,
      });
    } catch (error: any) {
      console.error("[ADMIN] Error triggering subscription setup:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Manually trigger sync for specific platform
   * POST /api/admin/teams/:teamId/platforms/:platform/sync
   */
  async triggerPlatformSync(req: Request, res: Response): Promise<void> {
    try {
      const { teamId, platform } = req.params;
      const { maxReviews = 100, isInitial = false } = req.body;

      console.log(`🔄 [ADMIN] Triggering ${platform} sync for team ${teamId}`);

      // Validate platform
      if (
        !["google_reviews", "facebook", "tripadvisor", "booking"].includes(
          platform,
        )
      ) {
        res.status(400).json({
          success: false,
          error: `Invalid platform: ${platform}`,
        });
        return;
      }

      // Check if platform is enabled
      const isEnabled = await this.featureExtractor.isPlatformEnabled(
        teamId,
        platform,
      );
      if (!isEnabled) {
        res.status(403).json({
          success: false,
          error: `Platform ${platform} not enabled for this team`,
        });
        return;
      }

      // Get business identifiers
      const identifiers = await this.getBusinessIdentifiers(
        teamId,
        platform as Platform,
      );

      if (identifiers.length === 0) {
        res.status(404).json({
          success: false,
          error: `No business profiles found for platform ${platform}`,
        });
        return;
      }

      // Trigger task
      const result = await this.taskService.runInitialTask({
        platform: platform as Platform,
        identifiers,
        isInitial,
        maxReviews,
        webhookUrl: `${process.env.WEBHOOK_BASE_URL}/api/webhooks/apify`,
      });

      res.json({
        success: true,
        message: "Platform sync triggered",
        teamId,
        platform,
        identifiersCount: identifiers.length,
        result,
      });
    } catch (error: any) {
      console.error("[ADMIN] Error triggering platform sync:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Refresh schedules for a team (re-sync identifiers)
   * POST /api/admin/teams/:teamId/schedules/refresh
   */
  async refreshSchedules(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;

      console.log(`🔄 [ADMIN] Refreshing schedules for team ${teamId}`);

      // Use subscription update to refresh
      const result = await this.orchestrator.handleSubscriptionUpdate(teamId);

      res.json({
        success: true,
        message: "Schedules refreshed",
        teamId,
        result,
      });
    } catch (error: any) {
      console.error("[ADMIN] Error refreshing schedules:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Pause all schedules for a team
   * POST /api/admin/teams/:teamId/schedules/pause
   */
  async pauseSchedules(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;

      console.log(`⏸️  [ADMIN] Pausing schedules for team ${teamId}`);

      const result =
        await this.orchestrator.handleSubscriptionCancellation(teamId);

      res.json({
        success: true,
        message: "Schedules paused",
        teamId,
        result,
      });
    } catch (error: any) {
      console.error("[ADMIN] Error pausing schedules:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Resume all schedules for a team
   * POST /api/admin/teams/:teamId/schedules/resume
   */
  async resumeSchedules(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;

      console.log(`▶️  [ADMIN] Resuming schedules for team ${teamId}`);

      // Get all paused schedules
      const schedules = await prisma.apifySchedule.findMany({
        where: { teamId, isActive: false },
      });

      let resumedCount = 0;
      for (const schedule of schedules) {
        try {
          await this.scheduleService.resumeSchedule(
            schedule.teamId,
            schedule.platform as any,
            schedule.scheduleType as any,
          );
          resumedCount++;
        } catch (error) {
          console.error(`Failed to resume schedule ${schedule.id}:`, error);
        }
      }

      res.json({
        success: true,
        message: "Schedules resumed",
        teamId,
        totalSchedules: schedules.length,
        resumedCount,
      });
    } catch (error: any) {
      console.error("[ADMIN] Error resuming schedules:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Delete all schedules for a team
   * DELETE /api/admin/teams/:teamId/schedules
   */
  async deleteSchedules(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;

      console.log(`🗑️  [ADMIN] Deleting schedules for team ${teamId}`);

      const deletedCount =
        await this.scheduleService.deleteTeamSchedules(teamId);

      res.json({
        success: true,
        message: "Schedules deleted",
        teamId,
        deletedCount,
      });
    } catch (error: any) {
      console.error("[ADMIN] Error deleting schedules:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get detailed status for a team
   * GET /api/admin/teams/:teamId/status
   */
  async getTeamStatus(req: Request, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;

      // Get team info
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          name: true,
          stripeCustomerId: true,
          subscription: {
            select: {
              status: true,
              tier: true,
              currentPeriodStart: true,
              currentPeriodEnd: true,
            },
          },
        },
      });

      if (!team) {
        res.status(404).json({
          success: false,
          error: "Team not found",
        });
        return;
      }

      // Get schedules
      const schedules = await this.scheduleService.getTeamSchedules(teamId);

      // Get recent syncs
      const recentSyncs = await prisma.syncRecord.findMany({
        where: { teamId },
        orderBy: { startedAt: "desc" },
        take: 10,
      });

      // Get business profiles count
      const businessCounts = {
        google: await prisma.googleBusinessProfile.count({ where: { teamId } }),
        facebook: await prisma.facebookBusinessProfile.count({
          where: { teamId },
        }),
        tripadvisor: await prisma.tripAdvisorBusinessProfile.count({
          where: { teamId },
        }),
        booking: await prisma.bookingBusinessProfile.count({
          where: { teamId },
        }),
      };

      // Get features
      const features = await this.featureExtractor.extractTeamFeatures(teamId);

      res.json({
        success: true,
        team,
        schedules: {
          total: schedules.length,
          active: schedules.filter((s) => s.isActive).length,
          details: schedules,
        },
        businessProfiles: businessCounts,
        recentSyncs,
        features,
      });
    } catch (error: any) {
      console.error("[ADMIN] Error getting team status:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get list of all teams with their schedule status
   * GET /api/admin/teams
   */
  async getAllTeams(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 50, hasSchedules } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: any = {};
      if (hasSchedules === "true") {
        where.apifySchedules = { some: {} };
      } else if (hasSchedules === "false") {
        where.apifySchedules = { none: {} };
      }

      const [teams, total] = await Promise.all([
        prisma.team.findMany({
          where,
          skip,
          take: Number(limit),
          select: {
            id: true,
            name: true,
            stripeCustomerId: true,
            subscription: {
              select: {
                status: true,
                tier: true,
              },
            },
            apifySchedules: {
              select: {
                id: true,
                platform: true,
                scheduleType: true,
                isActive: true,
              },
            },
            _count: {
              select: {
                syncRecords: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.team.count({ where }),
      ]);

      res.json({
        success: true,
        teams,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error("[ADMIN] Error getting teams:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Trigger manual sync for specific Apify schedule
   * POST /api/admin/schedules/:scheduleId/trigger
   */
  async triggerSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;

      console.log(`🔄 [ADMIN] Triggering schedule ${scheduleId}`);

      // Get schedule
      const schedule = await prisma.apifySchedule.findUnique({
        where: { id: scheduleId },
      });

      if (!schedule) {
        res.status(404).json({
          success: false,
          error: "Schedule not found",
        });
        return;
      }

      // Trigger schedule in Apify
      const result = await this.scheduleService.triggerSchedule(
        schedule.apifyScheduleId,
      );

      res.json({
        success: true,
        message: "Schedule triggered",
        scheduleId,
        platform: schedule.platform,
        scheduleType: schedule.scheduleType,
        result,
      });
    } catch (error: any) {
      console.error("[ADMIN] Error triggering schedule:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Helper: Get business identifiers for a platform
   */
  private async getBusinessIdentifiers(
    teamId: string,
    platform: Platform,
  ): Promise<string[]> {
    switch (platform) {
      case "google_reviews": {
        const profiles = await prisma.googleBusinessProfile.findMany({
          where: { teamId },
          select: { placeId: true },
        });
        return profiles.map((p) => p.placeId).filter(Boolean) as string[];
      }

      case "facebook": {
        const profiles = await prisma.facebookBusinessProfile.findMany({
          where: { teamId },
          select: { facebookUrl: true },
        });
        return profiles.map((p) => p.facebookUrl).filter(Boolean) as string[];
      }

      case "tripadvisor": {
        const profiles = await prisma.tripAdvisorBusinessProfile.findMany({
          where: { teamId },
          select: { tripAdvisorUrl: true },
        });
        return profiles
          .map((p) => p.tripAdvisorUrl)
          .filter(Boolean) as string[];
      }

      case "booking": {
        const profiles = await prisma.bookingBusinessProfile.findMany({
          where: { teamId },
          select: { bookingUrl: true },
        });
        return profiles.map((p) => p.bookingUrl).filter(Boolean) as string[];
      }

      default:
        return [];
    }
  }
}
