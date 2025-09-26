import { Actor, ActorJob, ReviewActorJobData } from "./actor";
import { DatabaseService } from "../../supabase/database";
import { GoogleReview, ReviewMetadata, MarketPlatform } from "@prisma/client";
import { GoogleOverviewService } from "../../supabase/googleOverviewService";
import { SentimentAnalyzer } from "../../sentimentAnalyzer/sentimentAnalyzer";
import { ApifyClient } from 'apify-client';
import { GoogleReviewAnalyticsService } from '../../services/googleReviewAnalyticsService';

export interface GoogleBusinessBatchJobPayload {
  platform: MarketPlatform.GOOGLE_MAPS;
  businesses: Array<{
    teamId: string;
    placeId: string;
    businessProfileId: string;
    maxReviews: number;
  }>;
  isInitialization: boolean;
}

export class GoogleBusinessReviewsBatchActor extends Actor {
  constructor() {
    // Use higher memory for batch processing (8GB)
    super('Xb8osYTtOjlsgI6k9', 8192, MarketPlatform.GOOGLE_MAPS);
  }

  /**
   * Update memory estimate based on batch size
   */
  updateMemoryEstimate(batchSize: number): void {
    // Scale memory based on batch size: 8GB base + 128MB per business
    this.memoryEstimateMB = 8192 + (batchSize * 128);
  }
}

export class GoogleBusinessReviewsBatchJob {
  private apifyClient: ApifyClient;
  private databaseService: DatabaseService;
  private analyticsService: GoogleReviewAnalyticsService;
  private jobPayload: GoogleBusinessBatchJobPayload;

  constructor(jobPayload: GoogleBusinessBatchJobPayload, apifyToken: string) {
    this.jobPayload = jobPayload;
    this.apifyClient = new ApifyClient({ token: apifyToken });
    this.databaseService = new DatabaseService();
    this.analyticsService = new GoogleReviewAnalyticsService();
  }

  public async run(): Promise<void> {
    const { businesses, isInitialization } = this.jobPayload;
    
    console.log(`[BatchActorJob] Starting Google Reviews batch scrape for ${businesses.length} businesses, initialization: ${isInitialization}`);

    try {
      // Step 1: Prepare all placeIds for batch processing
      const placeIds = businesses.map(b => b.placeId);
      const maxReviews = isInitialization ? 1000 : 50; // Standard batch limit

      // Step 2: Call Apify actor with all placeIds at once
      const actorId = process.env.APIFY_GOOGLE_REVIEWS_ACTOR_ID || 'compass/google-maps-reviews-scraper';
      const input = {
        placeIds: placeIds, // Pass all 30 placeIds as array
        maxReviews: maxReviews,
        language: 'en',
        allPlacesNoSearchLimit: 300, // Increased limit for batch processing
        // Add other necessary input fields for your Apify actor
      };

      console.log(`[BatchActorJob] Calling Apify actor ${actorId} with ${placeIds.length} placeIds`);
      const run = await this.apifyClient.actor(actorId).call(input);

      if (!run || !run.defaultDatasetId) {
        console.error(`[BatchActorJob] Apify actor run failed or did not produce a dataset for batch job.`);
        throw new Error('Apify actor run failed for Google Reviews batch.');
      }

      const { items: allReviewsFromApify } = await this.apifyClient.dataset(run.defaultDatasetId).listItems();

      if (!allReviewsFromApify || allReviewsFromApify.length === 0) {
        console.log(`[BatchActorJob] No new reviews found by Apify for batch job.`);
        // Update all businesses' scrapedAt timestamp
        await this.updateAllBusinessesTimestamps();
        return;
      }

      console.log(`[BatchActorJob] Fetched ${allReviewsFromApify.length} total reviews from Apify for ${businesses.length} businesses.`);

      // Step 3: Group reviews by placeId
      const reviewsByPlaceId = this.groupReviewsByPlaceId(allReviewsFromApify);

      // Step 4: Process each business's reviews
      let totalProcessed = 0;
      const results = [];

      for (const business of businesses) {
        try {
          const businessReviews = reviewsByPlaceId[business.placeId] || [];
          
          if (businessReviews.length > 0) {
            // Save reviews for this business
            const saveResult = await this.databaseService.saveGoogleReviewsWithMetadata(
              business.businessProfileId,
              business.placeId,
              businessReviews,
              isInitialization
            );

            console.log(`[BatchActorJob] Saved ${saveResult.savedCount} reviews for ${business.placeId}`);
            totalProcessed += saveResult.savedCount;
          }

          // Update business timestamp
          await this.databaseService.updateBusinessScrapedAt(business.placeId);

          // Trigger analytics processing
          await this.analyticsService.processReviewsAndUpdateDashboard(business.businessProfileId);

          results.push({
            placeId: business.placeId,
            teamId: business.teamId,
            reviewsProcessed: businessReviews.length,
            success: true
          });

        } catch (error) {
          console.error(`[BatchActorJob] Error processing reviews for ${business.placeId}:`, error);
          results.push({
            placeId: business.placeId,
            teamId: business.teamId,
            reviewsProcessed: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log(`[BatchActorJob] Batch processing complete. Total reviews processed: ${totalProcessed}`);
      console.log(`[BatchActorJob] Results summary:`, results);

    } catch (error) {
      console.error(`[BatchActorJob] Error during Google Reviews batch job:`, error);
      throw error;
    }
  }

  /**
   * Group reviews by placeId for easier processing
   */
  private groupReviewsByPlaceId(reviews: any[]): { [placeId: string]: any[] } {
    const grouped: { [placeId: string]: any[] } = {};
    
    for (const review of reviews) {
      const placeId = review.placeId;
      if (!placeId) continue;
      
      if (!grouped[placeId]) {
        grouped[placeId] = [];
      }
      grouped[placeId].push(review);
    }
    
    return grouped;
  }

  /**
   * Update timestamps for all businesses in case no reviews were found
   */
  private async updateAllBusinessesTimestamps(): Promise<void> {
    for (const business of this.jobPayload.businesses) {
      try {
        await this.databaseService.updateBusinessScrapedAt(business.placeId);
      } catch (error) {
        console.error(`[BatchActorJob] Error updating timestamp for ${business.placeId}:`, error);
      }
    }
  }
} 