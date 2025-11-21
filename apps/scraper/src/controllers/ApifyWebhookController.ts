/**
 * Apify Webhook Controller
 * Handles Apify actor run completion events
 */

import type { Request, Response } from "express";
import { prisma } from "@wirecrest/db";
import { ApifyDataSyncService } from "../services/apify/ApifyDataSyncService";
import { ReviewDataProcessor } from "../services/processing/ReviewDataProcessor";
import { sendNotification } from "../utils/notificationHelper";
import type { ActualApifyWebhookPayload, Platform } from "../types/apify.types";

export class ApifyWebhookController {
  private syncService: ApifyDataSyncService;
  private dataProcessor: ReviewDataProcessor;

  constructor(apifyToken: string) {
    this.syncService = new ApifyDataSyncService(apifyToken);
    this.dataProcessor = new ReviewDataProcessor();
  }

  /**
   * Handle Apify webhook events
   * 🔒 Security: Verifies webhook token to prevent unauthorized calls
   * 🔄 Idempotency: Prevents duplicate processing of the same run
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // 🔒 SECURITY: Verify webhook token
      const { token } = req.query;
      const expectedToken = process.env.APIFY_WEBHOOK_SECRET;

      if (!expectedToken) {
        console.error(
          "❌ APIFY_WEBHOOK_SECRET not configured - webhook security disabled!",
        );
        res.status(500).json({
          success: false,
          error: "Server configuration error",
          message: "Webhook secret not configured",
        });
        return;
      }

      if (token !== expectedToken) {
        console.warn(
          "⚠️  Invalid webhook token received - possible unauthorized access attempt",
        );
        res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "Invalid webhook token",
        });
        return;
      }

      console.log(
        "🚀 Apify webhook received REQ BODY:",
        JSON.stringify(req.body, null, 2),
      );

      const payload: ActualApifyWebhookPayload = req.body;

      // Handle TEST webhook events from Apify
      if (payload.eventType === "TEST") {
        console.log("✅ Received TEST webhook from Apify");
        res.json({
          success: true,
          received: true,
          message: "TEST webhook received successfully",
          eventType: "TEST",
          joke: payload.resource?.joke,
        });
        return;
      }

      // Validate required fields for real events
      if (!payload.eventData || !payload.eventData.actorRunId) {
        console.error(
          "❌ Invalid webhook payload: missing eventData or actorRunId",
        );
        res.status(400).json({
          success: false,
          error: "Invalid payload",
          message: "Missing required fields: eventData.actorRunId",
        });
        return;
      }

      const actorRunId = payload.eventData.actorRunId;
      console.log(
        `📨 Apify webhook received: ${payload.eventType} for run ${actorRunId}`,
      );

      // 🔄 IDEMPOTENCY: Check if already processed successfully
      const existingLog = await prisma.apifyWebhookLog.findFirst({
        where: {
          apifyRunId: actorRunId,
          processingStatus: "success",
        },
      });

      if (existingLog) {
        console.log(
          `✅ Webhook already processed successfully for run: ${actorRunId}`,
        );
        res.json({
          success: true,
          received: true,
          skipped: true,
          reason: "already_processed",
          previousProcessedAt: existingLog.processedAt,
          message: "Webhook already processed successfully",
        });
        return;
      }

      // Log webhook (only if not already successful)
      await prisma.apifyWebhookLog.create({
        data: {
          apifyRunId: actorRunId,
          eventType: payload.eventType,
          payload: payload as any,
          processingStatus: "pending",
        },
      });

      // Get sync record if it exists (for manual/initial runs)
      // Scheduled runs may not have a sync record, which is fine - we'll just process the data
      const syncRecord =
        await this.syncService.getSyncRecordByRunId(actorRunId);

      if (!syncRecord) {
        console.log(
          `ℹ️  No sync record found for run: ${actorRunId} - processing as scheduled/automated run`,
        );
      }

      // Handle based on event type
      let processingResult;
      switch (payload.eventType) {
        case "ACTOR.RUN.SUCCEEDED":
          processingResult = await this.handleRunSucceeded(payload, syncRecord);
          break;

        case "ACTOR.RUN.FAILED":
          processingResult = await this.handleRunFailed(payload, syncRecord);
          break;

        case "ACTOR.RUN.ABORTED":
          processingResult = await this.handleRunAborted(payload, syncRecord);
          break;

        default:
          console.log(`⚠️  Unhandled Apify event type: ${payload.eventType}`);
          res.json({
            success: true,
            received: true,
            processed: false,
            message: `Unhandled event type: ${payload.eventType}`,
            eventType: payload.eventType,
          });
          return;
      }

      res.json({
        success: true,
        received: true,
        processed: true,
        eventType: payload.eventType,
        runId: actorRunId,
        result: processingResult,
        message: `Successfully processed ${payload.eventType} event`,
      });
    } catch (error: any) {
      console.error("❌ Error processing Apify webhook:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process webhook",
        message: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  /**
   * Handle successful actor run
   */
  private async handleRunSucceeded(
    payload: ActualApifyWebhookPayload,
    syncRecord: any | null,
  ): Promise<any> {
    const actorRunId = payload.eventData!.actorRunId; // We've already validated this exists
    console.log("✅ Processing successful run:", actorRunId);

    try {
      const datasetId = payload.resource.defaultDatasetId;

      if (!datasetId) {
        throw new Error("No dataset ID in payload");
      }

      // Fetch data from Apify dataset
      const rawData = await this.syncService.fetchDatasetItems(datasetId);

      if (!rawData || rawData.length === 0) {
        console.log(
          "⚠️  No data in dataset - run completed but no items to process",
        );

        // Update sync record if it exists
        if (syncRecord) {
          await this.syncService.updateSyncRecord(syncRecord.id, {
            status: "completed",
            reviewsProcessed: 0,
            reviewsNew: 0,
            reviewsDuplicate: 0,
            businessesUpdated: 0,
          });
        }

        await prisma.apifyWebhookLog.updateMany({
          where: { apifyRunId: actorRunId },
          data: { processingStatus: "success" },
        });

        return {
          status: "completed",
          reviewsProcessed: 0,
          reviewsNew: 0,
          reviewsDuplicate: 0,
          businessesUpdated: 0,
          datasetId,
          message: "No data to process",
        };
      }

      // Normalize platform name
      const platform = this.normalizePlatform(payload.platform);

      // Process data based on platform
      // For scheduled runs without sync record, process per-business
      // The processor will determine the team based on business identifiers in the data
      const result = await this.dataProcessor.processReviews(
        syncRecord?.teamId || null, // null for scheduled runs
        platform as Platform,
        rawData,
        syncRecord?.syncType === "initial" || false,
      );

      // Update sync record with results if it exists (manual/subscription triggers)
      if (syncRecord) {
        await this.syncService.updateSyncRecord(syncRecord.id, {
          status: "completed",
          reviewsProcessed: result.reviewsProcessed,
          reviewsNew: result.reviewsNew,
          reviewsDuplicate: result.reviewsDuplicate,
          businessesUpdated: result.businessesUpdated,
        });

        // Update schedule last run time
        await this.syncService.updateScheduleLastRun(
          syncRecord.teamId,
          syncRecord.platform,
          syncRecord.syncType,
        );
      } else {
        // Scheduled run - create per-team sync records
        console.log("📊 Creating per-team sync records for scheduled run");
        await this.createSyncRecordsForScheduledRun(
          actorRunId,
          platform as Platform,
          rawData,
          result,
        );
      }

      // Update webhook log
      await prisma.apifyWebhookLog.updateMany({
        where: { apifyRunId: actorRunId },
        data: { processingStatus: "success" },
      });

      console.log("✅ Successfully processed run:", actorRunId, result);

      return {
        status: "completed",
        reviewsProcessed: result.reviewsProcessed,
        reviewsNew: result.reviewsNew,
        reviewsDuplicate: result.reviewsDuplicate,
        businessesUpdated: result.businessesUpdated,
        datasetId,
        teamId: syncRecord?.teamId,
        platform: platform,
      };
    } catch (error: any) {
      console.error("Error processing succeeded run:", error);

      // Update sync record if it exists
      if (syncRecord) {
        await this.syncService.updateSyncRecord(syncRecord.id, {
          status: "failed",
          errorMessage: `Processing error: ${error.message}`,
        });
      }

      await prisma.apifyWebhookLog.updateMany({
        where: { apifyRunId: actorRunId },
        data: {
          processingStatus: "failed",
          errorMessage: error.message,
        },
      });

      throw error; // Re-throw to be handled by the main webhook handler
    }
  }

  /**
   * Handle failed actor run
   */
  private async handleRunFailed(
    payload: ActualApifyWebhookPayload,
    syncRecord: any | null,
  ): Promise<any> {
    const actorRunId = payload.eventData!.actorRunId; // We've already validated this exists
    console.error("❌ Actor run failed:", actorRunId);

    const platform = this.normalizePlatform(payload.platform);

    // Update sync record if it exists
    if (syncRecord) {
      await this.syncService.updateSyncRecord(syncRecord.id, {
        status: "failed",
        errorMessage: "Apify actor run failed",
      });
    }

    // Send admin notification about failure
    await sendNotification({
      type: "mail",
      scope: "super",
      superRole: "ADMIN",
      title: `<p>Scraper run failed for <strong>${platform}</strong></p>`,
      category: "System",
      metadata: {
        runId: actorRunId,
        platform: platform,
        teamId: syncRecord?.teamId || "unknown",
        error: "Apify actor run failed",
        statusMessage: payload.resource.statusMessage,
      },
      expiresInDays: 7,
    });

    await prisma.apifyWebhookLog.updateMany({
      where: { apifyRunId: actorRunId },
      data: {
        processingStatus: "failed",
        errorMessage: "Actor run failed",
      },
    });

    return {
      status: "failed",
      error: "Apify actor run failed",
      runId: actorRunId,
      teamId: syncRecord?.teamId,
      platform: platform,
      notificationSent: true,
    };
  }

  /**
   * Handle aborted actor run
   */
  private async handleRunAborted(
    payload: ActualApifyWebhookPayload,
    syncRecord: any | null,
  ): Promise<any> {
    const actorRunId = payload.eventData!.actorRunId; // We've already validated this exists
    console.warn("⚠️ Actor run aborted:", actorRunId);

    const platform = this.normalizePlatform(payload.platform);

    // Update sync record if it exists
    if (syncRecord) {
      await this.syncService.updateSyncRecord(syncRecord.id, {
        status: "failed",
        errorMessage: "Apify actor run aborted",
      });
    }

    // Send admin notification about abortion
    await sendNotification({
      type: "delivery",
      scope: "super",
      superRole: "ADMIN",
      title: `<p>Scraper run aborted for <strong>${platform}</strong></p>`,
      category: "System",
      metadata: {
        runId: actorRunId,
        teamId: syncRecord?.teamId || "unknown",
        platform: platform,
      },
      expiresInDays: 7,
    });

    await prisma.apifyWebhookLog.updateMany({
      where: { apifyRunId: actorRunId },
      data: {
        processingStatus: "failed",
        errorMessage: "Actor run aborted",
      },
    });

    return {
      status: "aborted",
      error: "Apify actor run aborted",
      runId: actorRunId,
      teamId: syncRecord?.teamId,
      platform: platform,
      notificationSent: true,
    };
  }

  /**
   * Normalize platform name from webhook to match our Platform type
   * "facebook_reviews" -> "facebook"
   * "google_reviews" -> "google_reviews" (unchanged)
   */
  private normalizePlatform(platformFromWebhook: string): string {
    // Map webhook platform names to our Platform type
    const platformMap: Record<string, string> = {
      facebook_reviews: "facebook",
      google_reviews: "google_reviews",
      tripadvisor_reviews: "tripadvisor",
      booking_reviews: "booking",
    };

    return platformMap[platformFromWebhook] || platformFromWebhook;
  }

  /**
   * Create per-team sync records for scheduled runs
   * Each team that has data in this run gets its own sync record
   */
  private async createSyncRecordsForScheduledRun(
    apifyRunId: string,
    platform: Platform,
    rawData: any[],
    aggregatedResult: any,
  ): Promise<void> {
    try {
      // Group data by team
      const teamStats = await this.groupDataByTeam(platform, rawData);

      console.log(
        `  Found ${Object.keys(teamStats).length} teams in scheduled run`,
      );

      // Create sync record for each team (even if 0 new reviews)
      for (const [teamId, stats] of Object.entries(teamStats)) {
        try {
          const uniqueRunId = `${apifyRunId}-${teamId}`;

          // Create sync record
          await this.syncService.createSyncRecord(
            teamId,
            platform,
            "recurring_reviews",
            uniqueRunId,
            null, // No specific dataset per team for scheduled runs
          );

          // Immediately update with results
          const syncRecord =
            await this.syncService.getSyncRecordByRunId(uniqueRunId);
          if (syncRecord) {
            await this.syncService.updateSyncRecord(syncRecord.id, {
              status: "completed",
              reviewsProcessed: stats.reviewsProcessed,
              reviewsNew: stats.reviewsNew,
              reviewsDuplicate: stats.reviewsDuplicate,
              businessesUpdated: stats.businessesUpdated,
            });
          }

          console.log(
            `  ✅ Created sync record for team ${teamId}: ${stats.reviewsNew} new reviews`,
          );
        } catch (error) {
          console.error(
            `  ❌ Failed to create sync record for team ${teamId}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error("Error creating sync records for scheduled run:", error);
      // Don't throw - sync record creation shouldn't break webhook processing
    }
  }

  /**
   * Group scraped data by team ID
   * Returns stats per team
   */
  private async groupDataByTeam(
    platform: Platform,
    rawData: any[],
  ): Promise<
    Record<
      string,
      {
        reviewsProcessed: number;
        reviewsNew: number;
        reviewsDuplicate: number;
        businessesUpdated: number;
      }
    >
  > {
    const teamStats: Record<string, any> = {};

    // Extract unique identifiers from data
    const identifiers = this.extractIdentifiersFromData(platform, rawData);

    console.log(
      `  Extracted ${identifiers.length} unique identifier(s) from data`,
    );

    // For each identifier, look up which team it belongs to
    for (const identifier of identifiers) {
      const teamId = await this.findTeamIdByIdentifier(platform, identifier);

      if (!teamId) {
        console.warn(
          `  Could not find team for ${platform} identifier: ${identifier}`,
        );
        continue;
      }

      if (!teamStats[teamId]) {
        teamStats[teamId] = {
          reviewsProcessed: 0,
          reviewsNew: 0,
          reviewsDuplicate: 0,
          businessesUpdated: 1, // This team has at least 1 business
        };
      }

      // Count reviews for this identifier
      const identifierData = rawData.filter((item) =>
        this.matchesIdentifier(platform, item, identifier),
      );

      teamStats[teamId].reviewsProcessed += identifierData.length;
      // Note: reviewsNew/duplicate will be calculated during actual processing
      // This is just for the sync record
    }

    return teamStats;
  }

  /**
   * Extract unique identifiers from raw scraped data
   */
  private extractIdentifiersFromData(
    platform: Platform,
    rawData: any[],
  ): string[] {
    switch (platform) {
      case "google_reviews":
        return [...new Set(rawData.map((r) => r.placeId).filter(Boolean))];
      case "facebook":
        return [...new Set(rawData.map((r) => r.facebookUrl).filter(Boolean))];
      case "tripadvisor":
        return [
          ...new Set(
            rawData.map((r) => r.url || r.tripAdvisorUrl).filter(Boolean),
          ),
        ];
      case "booking":
        return [
          ...new Set(rawData.map((r) => r.url || r.bookingUrl).filter(Boolean)),
        ];
      default:
        return [];
    }
  }

  /**
   * Check if a data item matches a specific identifier
   */
  private matchesIdentifier(
    platform: Platform,
    item: any,
    identifier: string,
  ): boolean {
    switch (platform) {
      case "google_reviews":
        return item.placeId === identifier;
      case "facebook":
        return item.facebookUrl === identifier;
      case "tripadvisor":
        return item.url === identifier || item.tripAdvisorUrl === identifier;
      case "booking":
        return item.url === identifier || item.bookingUrl === identifier;
      default:
        return false;
    }
  }

  /**
   * Find which team owns a specific business identifier
   */
  private async findTeamIdByIdentifier(
    platform: Platform,
    identifier: string,
  ): Promise<string | null> {
    try {
      switch (platform) {
        case "google_reviews":
          const google = await prisma.googleBusinessProfile.findFirst({
            where: { placeId: identifier },
            select: { businessLocation: { select: { teamId: true } } },
          });
          return google?.businessLocation?.teamId || null;
        case "facebook":
          const facebook = await prisma.facebookBusinessProfile.findFirst({
            where: { facebookUrl: identifier },
            select: { businessLocation: { select: { teamId: true } } },
          });
          return facebook?.businessLocation?.teamId || null;
        case "tripadvisor":
          const tripadvisor = await prisma.tripAdvisorBusinessProfile.findFirst(
            {
              where: { tripAdvisorUrl: identifier },
              select: { businessLocation: { select: { teamId: true } } },
            },
          );
          return tripadvisor?.businessLocation?.teamId || null;
        case "booking":
          const booking = await prisma.bookingBusinessProfile.findFirst({
            where: { bookingUrl: identifier },
            select: { businessLocation: { select: { teamId: true } } },
          });
          return booking?.businessLocation?.teamId || null;
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error finding team for ${platform}:${identifier}`, error);
      return null;
    }
  }
}
