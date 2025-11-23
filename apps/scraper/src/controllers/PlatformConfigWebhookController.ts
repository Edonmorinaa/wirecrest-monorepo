/**
 * Platform Configuration Webhook Controller
 * Handles platform configuration events from the dashboard
 * Triggers initial scraping when a platform is configured after subscription
 */

import type { Request, Response } from "express";
import { StripeFirstSubscriptionService } from "@wirecrest/billing";
import { SubscriptionOrchestrator } from "../services/subscription/SubscriptionOrchestrator";
import { BusinessProfileCreationService } from "../services/businessProfileCreationService";
import { MarketPlatform } from "@prisma/client";
import type { Platform } from "../types/apify.types";

export class PlatformConfigWebhookController {
  private orchestrator: SubscriptionOrchestrator;
  private apifyToken: string;

  constructor(apifyToken: string, webhookBaseUrl: string) {
    this.orchestrator = new SubscriptionOrchestrator(
      apifyToken,
      webhookBaseUrl,
    );
    this.apifyToken = apifyToken;
  }

  /**
   * Handle platform configured event
   * Triggered when a user adds a platform identifier in the dashboard
   */
  async handlePlatformConfigured(req: Request, res: Response): Promise<void> {
    try {
      const { teamId, locationId, platform, identifier } = req.body;

      // Validate required fields
      if (!teamId || !locationId || !platform || !identifier) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: teamId, locationId, platform, identifier",
        });
        return;
      }

      console.log(`📍 Platform configuration webhook received:`, {
        teamId,
        locationId,
        platform,
        identifier,
      });

      // Check if team has active subscription
      const subscription = await this.getTeamSubscription(teamId);

      if (!subscription) {
        console.log(
          `⚠️ Team ${teamId} has no active subscription, skipping scraping setup`,
        );
        res.json({
          success: true,
          message:
            "Platform configured but no active subscription. Scraping will start when subscription is active.",
          initialTaskStarted: false,
          businessAdded: false,
        });
        return;
      }

      console.log(`✅ Team ${teamId} has active subscription`);

      // STEP 1: Ensure business profile exists (create if missing)
      const profileService = new BusinessProfileCreationService(
        this.apifyToken,
      );
      const profileResult = await profileService.ensureBusinessProfileExists(
        teamId,
        locationId,
        this.mapPlatformToMarketPlatform(platform),
        identifier,
      );

      if (!profileResult.exists) {
        res.status(500).json({
          success: false,
          error: "Failed to create business profile",
          message:
            profileResult.error || "Unknown error during profile creation",
        });
        return;
      }

      console.log(
        `✅ Business profile ready: ${profileResult.businessProfileId} (created: ${profileResult.created})`,
      );

      // STEP 2: Trigger initial scrape + add to schedule
      // Instagram doesn't use Apify, so handle it separately
      if (platform === 'instagram') {
        console.log(`📸 Instagram profile created, skipping Apify scheduling`);
        res.json({
          success: true,
          message: "Instagram profile created successfully",
          profileCreated: profileResult.created,
          businessProfileId: profileResult.businessProfileId,
          initialTaskStarted: false,
          businessAdded: true,
        });
        return;
      }

      const apifyPlatform = this.mapPlatformToApifyPlatform(platform);
      const result = await this.orchestrator.handlePlatformAdded(
        teamId,
        apifyPlatform,
        identifier,
      );

      console.log(`✅ Platform configuration handled:`, result);

      res.json({
        ...result,
        profileCreated: profileResult.created,
        businessProfileId: profileResult.businessProfileId,
      });
    } catch (error: any) {
      console.error("Error handling platform configuration:", error);
      res.status(500).json({
        success: false,
        error: "Failed to handle platform configuration",
        message: error.message,
      });
    }
  }

  /**
   * Get team subscription status using Stripe-First approach
   * This checks Stripe directly via the billing package
   */
  private async getTeamSubscription(teamId: string): Promise<any | null> {
    try {
      const subscriptionService = new StripeFirstSubscriptionService();
      const subscription =
        await subscriptionService.getTeamSubscription(teamId);

      console.log(`🔍 Subscription check for team ${teamId}:`, {
        tier: subscription.tier,
        hasStripeSubscription: !!subscription.stripeSubscriptionId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      });

      // Check if team has an active paid subscription (not FREE tier)
      if (subscription.tier !== "FREE" && subscription.stripeSubscriptionId) {
        return subscription;
      }

      console.log(
        `⚠️ Team ${teamId} is on ${subscription.tier} tier, no paid subscription found`,
      );
      return null;
    } catch (error) {
      console.error("Error fetching team subscription from Stripe:", error);
      return null;
    }
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
      instagram: MarketPlatform.INSTAGRAM,
      tiktok: MarketPlatform.TIKTOK,
    };
    return mapping[platform] || MarketPlatform.GOOGLE_MAPS; // Default fallback
  }

  /**
   * Map platform string to Apify Platform type
   */
  private mapPlatformToApifyPlatform(platform: string): Platform {
    const mapping: Record<string, Platform> = {
      google_maps: "google_reviews",
      google_reviews: "google_reviews",
      facebook: "facebook",
      tripadvisor: "tripadvisor",
      booking: "booking",
    };
    return mapping[platform] || "google_reviews"; // Default fallback
  }
}
