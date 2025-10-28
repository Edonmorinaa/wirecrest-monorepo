import { Actor, ActorJob, ReviewActorJobData } from "./actor";
import { DatabaseService } from "../../supabase/database";
import { GoogleReview, ReviewMetadata, MarketPlatform } from "@prisma/client";
import { GoogleOverviewService } from "../../supabase/googleOverviewService";
import { ApifyClient } from 'apify-client';
import { GoogleReviewAnalyticsService } from '../../services/googleReviewAnalyticsService';

export class GoogleBusinessReviewsActor extends Actor {
    constructor() {
        // Use 1GB for initialization jobs, 4GB for regular jobs
        const platform: MarketPlatform = 'GOOGLE_MAPS' as MarketPlatform;
        super('Xb8osYTtOjlsgI6k9', 1024, platform);
    }

    /**
     * Update memory estimate based on job type
     */
    updateMemoryEstimate(isInitialization: boolean): void {
        this.memoryEstimateMB = isInitialization ? 1024 : 4096; // 1GB for init, 4GB for regular
    }
}

// This would be part of your ActorManager or job definition system
export interface GoogleBusinessReviewsActorJobPayload {
  platform: MarketPlatform.GOOGLE_MAPS;
  teamId: string;      // Needed for context, though placeId is primary for Google
  placeId: string;
  businessProfileId?: string; // Optional: if already known, saves a lookup
  isInitialization: boolean;
  maxReviews?: number;  // Passed to Apify actor if it supports it
  // Potentially: lastScrapedReviewDate for incremental scrapes
}

export class GoogleBusinessReviewsActorJob {
  private apifyClient: ApifyClient;
  private databaseService: DatabaseService;
  private analyticsService: GoogleReviewAnalyticsService;
  private jobPayload: GoogleBusinessReviewsActorJobPayload;

  constructor(jobPayload: GoogleBusinessReviewsActorJobPayload, apifyToken: string /*, dbConnectionString: string */) {
    this.jobPayload = jobPayload;
    this.apifyClient = new ApifyClient({ token: apifyToken });
    this.databaseService = new DatabaseService(); // Assumes DatabaseService constructor is parameterless now
    this.analyticsService = new GoogleReviewAnalyticsService();
  }

  public async run(): Promise<void> {
    const { placeId, isInitialization, maxReviews, teamId } = this.jobPayload;
    let { businessProfileId } = this.jobPayload;

    console.log(`[ActorJob] Starting Google Reviews scrape for placeId: ${placeId}, initialization: ${isInitialization}`);

    try {
      // Step 1: Ensure we have the businessProfileId (UUID) from our database
      if (!businessProfileId) {
        const profile = await this.databaseService.getBusinessByPlaceId(placeId);
        if (!profile) {
          console.error(`[ActorJob] No GoogleBusinessProfile found for placeId: ${placeId}. Cannot save reviews.`);
          // Optionally: create a notification or error log for the team/admin
          return;
        }
        if (profile.teamId !== teamId) {
            console.error(`[ActorJob] Mismatched teamId for placeId ${placeId}. Expected ${teamId}, found ${profile.teamId}.`);
            return;
        }
        businessProfileId = profile.id;
      }

      // Step 2: Call Apify actor to scrape reviews
      // Replace with your actual Apify actor ID and input structure
      const actorId = process.env.APIFY_GOOGLE_REVIEWS_ACTOR_ID || 'your_google_reviews_actor_id'; 
      const input = {
        placeIds: [placeId],
        maxReviews: isInitialization ? (maxReviews || 1000) : 50, // Example: more for init, fewer for polling
        // Add other necessary input fields for your Apify actor (language, etc.)
        // lastReviewDate: this.jobPayload.lastScrapedReviewDate, // For incremental scrapes
      };

      console.log(`[ActorJob] Calling Apify actor ${actorId} with input:`, input);
      const run = await this.apifyClient.actor(actorId).call(input);

      if (!run || !run.defaultDatasetId) {
        console.error(`[ActorJob] Apify actor run failed or did not produce a dataset for placeId: ${placeId}.`);
        throw new Error('Apify actor run failed for Google Reviews.');
      }

      const { items: reviewsFromApify } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();

      if (!reviewsFromApify || reviewsFromApify.length === 0) {
        console.log(`[ActorJob] No new reviews found by Apify for placeId: ${placeId}.`);
        // Still might be worth updating the 'scrapedAt' timestamp for the business profile
        await this.databaseService.updateBusinessScrapedAt(placeId); // Method only needs placeId
        // And potentially trigger analytics for snapshot update even with 0 new reviews for the period
        await this.analyticsService.processReviewsAndUpdateDashboard(businessProfileId);
        return;
      }

      console.log(`[ActorJob] Fetched ${reviewsFromApify.length} reviews from Apify for placeId: ${placeId}.`);

      // Step 3: Save reviews to database (this method needs to handle ReviewMetadata creation)
      // This method now encapsulates the logic for creating ReviewMetadata and GoogleReview
      await this.databaseService.saveGoogleReviewsWithMetadata(businessProfileId, placeId, reviewsFromApify, isInitialization);
      console.log(`[ActorJob] Successfully saved ${reviewsFromApify.length} reviews for placeId: ${placeId}.`);

      // Step 4: Update business scrapedAt timestamp and other metadata
      // The teamId is retrieved internally by updateBusinessScrapedAt from the database
      await this.databaseService.updateBusinessScrapedAt(placeId);

      // Step 5: Trigger review analytics processing for the dashboard
      console.log(`[ActorJob] Triggering dashboard analytics update for businessProfileId: ${businessProfileId}`);
      await this.analyticsService.processReviewsAndUpdateDashboard(businessProfileId);
      console.log(`[ActorJob] Dashboard analytics update complete for businessProfileId: ${businessProfileId}`);

      console.log(`[ActorJob] Google Reviews scrape and processing finished successfully for placeId: ${placeId}.`);

    } catch (error) {
      console.error(`[ActorJob] Error during Google Reviews job for placeId: ${placeId}:`, error);
      // Add more robust error handling: retry logic, dead-letter queue, notifications, etc.
      throw error; // Re-throw to allow job queue to handle retries/failures if configured
    }
  }
}