import { Actor, ActorJob, ReviewActorJobData } from "./actor";
import { DatabaseService } from "../../supabase/database";
import { GoogleReview, ReviewMetadata, MarketPlatform } from "@prisma/client";
import { GoogleOverviewService } from "../../supabase/googleOverviewService";
import { SentimentAnalyzer } from "../../sentimentAnalyzer/sentimentAnalyzer";
import { ApifyClient } from 'apify-client';
import { GoogleReviewAnalyticsService } from '../../services/googleReviewAnalyticsService';

// Common words to exclude from keyword analysis
const COMMON_WORDS = new Set(['the', 'and', 'a', 'to', 'of', 'in', 'is', 'it', 'that', 'for', 'on', 'with', 'as', 'at', 'this', 'by', 'from', 'an', 'be', 'or']);

// Business-specific terms and their categories
const BUSINESS_TERMS = {
  service: ['service', 'staff', 'employee', 'server', 'waiter', 'host', 'friendly', 'helpful', 'attentive', 'professional', 'rude', 'slow', 'unhelpful'],
  food: ['food', 'dish', 'meal', 'taste', 'flavor', 'menu', 'delicious', 'fresh', 'quality', 'portion', 'cooked', 'spicy', 'bland'],
  ambiance: ['ambiance', 'atmosphere', 'decor', 'environment', 'setting', 'clean', 'dirty', 'noisy', 'quiet', 'cozy', 'modern', 'traditional'],
  value: ['price', 'value', 'worth', 'expensive', 'cheap', 'affordable', 'overpriced', 'reasonable', 'budget', 'cost'],
  location: ['location', 'place', 'area', 'neighborhood', 'district', 'parking', 'accessible', 'convenient', 'remote'],
  timing: ['wait', 'time', 'quick', 'fast', 'slow', 'busy', 'crowded', 'empty', 'reservation', 'booking'],
  quality: ['quality', 'excellent', 'good', 'bad', 'poor', 'amazing', 'terrible', 'outstanding', 'disappointing'],
  experience: ['experience', 'visit', 'return', 'recommend', 'enjoy', 'disappoint', 'satisfy', 'impress']
};

// Initialize sentiment analyzer
const sentimentAnalyzer = new SentimentAnalyzer(['en']);

async function analyzeReview(text?: string, rating?: number): Promise<{ 
  sentiment: number; 
  emotional?: string;
  keywords: string[];
  topics: string[];
  responseUrgency: number;
}> {
  if (!text) {
    return {
      sentiment: 0,
      emotional: 'neutral',
      keywords: [],
      topics: [],
      responseUrgency: 3 // Changed from 0.3 to 3 (scale 1-10)
    };
  }

  // Get sentiment score from analyzer
  const sentimentScore = await sentimentAnalyzer.analyzeSentiment(text);
  
  // Determine emotional state based on sentiment score and rating
  let emotional: string;
  if (sentimentScore > 0.3) emotional = 'positive';
  else if (sentimentScore < -0.3) emotional = 'negative';
  else emotional = 'neutral';

  // If we have a rating, adjust sentiment based on it
  const finalSentiment = rating ? (sentimentScore + (rating - 3) / 2) / 2 : sentimentScore;

  // Extract keywords using TF-IDF like approach
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !COMMON_WORDS.has(word));

  // Count word frequencies
  const wordFreq: { [key: string]: number } = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  // Calculate word importance based on frequency and position
  const wordImportance: { [key: string]: number } = {};
  Object.entries(wordFreq).forEach(([word, freq]) => {
    // Words that appear in business terms get a boost
    const isBusinessTerm = Object.values(BUSINESS_TERMS).some(terms => 
      terms.some(term => word.includes(term) || term.includes(word))
    );
    
    // Words that appear in the first or last sentence get a boost
    const sentences = text.split(/[.!?]+/);
    const isInImportantPosition = sentences[0].includes(word) || sentences[sentences.length - 1].includes(word);
    
    wordImportance[word] = freq * (isBusinessTerm ? 1.5 : 1) * (isInImportantPosition ? 1.3 : 1);
  });

  // Get top keywords
  const keywords = Object.entries(wordImportance)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  // Extract topics based on business terms
  const topics = new Set<string>();
  Object.entries(BUSINESS_TERMS).forEach(([topic, terms]) => {
    if (terms.some(term => text.toLowerCase().includes(term))) {
      topics.add(topic);
    }
  });

  // Calculate response urgency on scale 1-10 (integers only)
  let responseUrgency = 3; // Default urgency
  if (rating && rating <= 2) responseUrgency = 10;
  else if (rating && rating === 3) responseUrgency = 7;
  if (sentimentScore < -0.5) responseUrgency = Math.max(responseUrgency, 8);
  if (text.toLowerCase().includes('complaint') || text.toLowerCase().includes('issue')) {
    responseUrgency = Math.max(responseUrgency, 9);
  }

  return {
    sentiment: Number(finalSentiment.toFixed(2)),
    emotional,
    keywords,
    topics: Array.from(topics),
    responseUrgency: responseUrgency // Now returns integer
  };
}

export class GoogleBusinessReviewsActor extends Actor {
    constructor() {
        // Use 1GB for initialization jobs, 4GB for regular jobs
        super('Xb8osYTtOjlsgI6k9', 1024, MarketPlatform.GOOGLE_MAPS);
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