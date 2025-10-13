/**
 * Apify Task Service
 * Handles creation and execution of one-time Apify actor tasks
 */

import { ApifyClient } from 'apify-client';
import type {
  Platform,
  TaskRunConfig,
  TaskRunResult,
  GoogleMapsActorInput,
  FacebookActorInput,
  TripAdvisorActorInput,
  BookingActorInput,
  ApifyWebhookConfig,
  ApifyEventType,
} from '../../types/apify.types';

const ACTOR_IDS: Record<Platform, string> = {
  google_reviews: 'Xb8osYTtOjlsgI6k9',  // Google Maps Reviews Scraper (specialized, cost-effective)
  facebook: 'dX3d80hsNMilEwjXG',         // Facebook Reviews Scraper (specialized)
  tripadvisor: 'Hvp4YfFGyLM635Q2F',     // TripAdvisor Reviews Scraper (specialized)
  booking: 'PbMHke3jW25J6hSOA',          // Booking.com Reviews Scraper (specialized)
};

export class ApifyTaskService {
  private apifyClient: ApifyClient;
  private webhookBaseUrl: string;

  constructor(apifyToken: string, webhookBaseUrl: string) {
    this.apifyClient = new ApifyClient({ token: apifyToken });
    this.webhookBaseUrl = webhookBaseUrl;
  }

  /**
   * Run a one-time task for initial data fetch
   */
  async runInitialTask(config: TaskRunConfig): Promise<TaskRunResult> {
    const actorId = ACTOR_IDS[config.platform];
    const input = this.buildActorInput(config);

    const run = await this.apifyClient.actor(actorId).call(input, {
      memory: 4096, // 4GB
      timeout: 3600, // 1 hour
    });

    return {
      apifyRunId: run.id,
      status: run.status === 'RUNNING' ? 'running' : 'pending',
      startedAt: new Date(run.startedAt),
      estimatedCompletion: this.estimateCompletion(config.identifiers.length, config.maxReviews),
    };
  }

  /**
   * Build actor-specific input
   */
  private buildActorInput(config: TaskRunConfig): any {
    const webhookConfig = this.buildWebhookConfig(config.platform);

    switch (config.platform) {
      case 'google_reviews':
        return this.buildGoogleMapsInput(config, webhookConfig);
      case 'facebook':
        return this.buildFacebookInput(config, webhookConfig);
      case 'tripadvisor':
        return this.buildTripAdvisorInput(config, webhookConfig);
      case 'booking':
        return this.buildBookingInput(config, webhookConfig);
    }
  }

  /**
   * Build Google Maps Reviews actor input
   * Note: Google Maps Reviews Scraper accepts an ARRAY of placeIds - we can batch them all together!
   * This is a specialized, cost-effective actor focused purely on reviews ($0.50 per 1000 reviews)
   */
  private buildGoogleMapsInput(
    config: TaskRunConfig,
    webhooks: ApifyWebhookConfig[]
  ): GoogleMapsActorInput {
    return {
      placeIds: config.identifiers, // Array of all place IDs - batched together
      maxReviews: config.maxReviews,
      reviewsSort: 'newest',
      language: 'en',
      reviewsOrigin: 'google', // Only Google reviews (not TripAdvisor etc)
      personalData: false, // Don't scrape personal reviewer data (GDPR compliant)
      webhooks,
    };
  }

  /**
   * Build Facebook actor input
   * Using Facebook Reviews Scraper (dX3d80hsNMilEwjXG)
   */
  private buildFacebookInput(
    config: TaskRunConfig,
    webhooks: ApifyWebhookConfig[]
  ): FacebookActorInput {
    return {
      startUrls: config.identifiers.map((url) => ({ url })),
      resultsLimit: config.maxReviews,
      proxy: {
        apifyProxyGroups: ['RESIDENTIAL'],
      },
      maxRequestRetries: 10,
      webhooks,
    };
  }

  /**
   * Build TripAdvisor actor input
   * Using TripAdvisor Reviews Scraper (Hvp4YfFGyLM635Q2F)
   */
  private buildTripAdvisorInput(
    config: TaskRunConfig,
    webhooks: ApifyWebhookConfig[]
  ): TripAdvisorActorInput {
    return {
      startUrls: config.identifiers.map((url) => ({ url })),
      maxItemsPerQuery: config.maxReviews,
      scrapeReviewerInfo: true,
      reviewRatings: ['ALL_REVIEW_RATINGS'],
      reviewsLanguages: ['ALL_REVIEW_LANGUAGES'],
      webhooks,
    };
  }

  /**
   * Build Booking.com actor input
   * Using Booking.com Reviews Scraper (PbMHke3jW25J6hSOA)
   */
  private buildBookingInput(
    config: TaskRunConfig,
    webhooks: ApifyWebhookConfig[]
  ): BookingActorInput {
    return {
      startUrls: config.identifiers.map((url) => ({ url })),
      maxReviewsPerHotel: config.maxReviews,
      sortReviewsBy: 'f_recent_desc',  // Newest first for deduplication
      reviewScores: ['ALL'],
      proxyConfiguration: {
        useApifyProxy: true,
      },
      webhooks,
    };
  }

  /**
   * Build webhook configuration
   * 🔒 Security: Includes secret token to prevent unauthorized webhook calls
   */
  private buildWebhookConfig(platform: Platform): ApifyWebhookConfig[] {
    const webhookSecret = process.env.APIFY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('APIFY_WEBHOOK_SECRET environment variable is required for webhook security');
    }

    const eventTypes: ApifyEventType[] = [
      'ACTOR.RUN.SUCCEEDED',
      'ACTOR.RUN.FAILED',
      'ACTOR.RUN.ABORTED',
    ];

    return [
      {
        eventTypes,
        requestUrl: `${this.webhookBaseUrl}/webhooks/apify?token=${webhookSecret}`,
        payloadTemplate: JSON.stringify({
          platform,
          eventType: '{{eventType}}',
          actorRunId: '{{resource.id}}',
          datasetId: '{{resource.defaultDatasetId}}',
          status: '{{resource.status}}',
        }),
      },
    ];
  }

  /**
   * Estimate task completion time
   */
  private estimateCompletion(businessCount: number, maxReviews: number): Date {
    // Rough estimate: 30 seconds per business + 1 second per review
    const estimatedSeconds = businessCount * 30 + (businessCount * maxReviews) / 10;
    return new Date(Date.now() + estimatedSeconds * 1000);
  }

  /**
   * Get task run status
   */
  async getRunStatus(apifyRunId: string): Promise<{
    status: string;
    startedAt: Date;
    finishedAt?: Date;
    datasetId?: string;
  }> {
    const run = await this.apifyClient.run(apifyRunId).get();
    
    return {
      status: run?.status || 'UNKNOWN',
      startedAt: new Date(run?.startedAt || Date.now()),
      finishedAt: run?.finishedAt ? new Date(run.finishedAt) : undefined,
      datasetId: run?.defaultDatasetId,
    };
  }

  /**
   * Abort a running task
   */
  async abortRun(apifyRunId: string): Promise<void> {
    await this.apifyClient.run(apifyRunId).abort();
  }
}

