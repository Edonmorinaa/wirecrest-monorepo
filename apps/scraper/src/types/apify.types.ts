/**
 * Apify Integration Type Definitions
 */

export type Platform = 'google_reviews' | 'facebook' | 'tripadvisor' | 'booking';

export type ScheduleType = 'reviews' | 'overview';

export type SyncType = 'initial' | 'recurring_reviews' | 'recurring_overview';

export type SyncStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ApifyEventType = 'ACTOR.RUN.SUCCEEDED' | 'ACTOR.RUN.FAILED' | 'ACTOR.RUN.ABORTED';

/**
 * Apify webhook payload structure
 */
export interface ApifyWebhookPayload {
  eventType: ApifyEventType;
  eventData: {
    actorId: string;
    actorRunId: string;
    startedAt: string;
    finishedAt: string;
    status: 'SUCCEEDED' | 'FAILED' | 'ABORTED';
    defaultDatasetId: string;
    defaultKeyValueStoreId: string;
    stats: {
      inputBodyLen: number;
      restartCount: number;
      resurrectCount: number;
      memAvgBytes: number;
      memMaxBytes: number;
      memCurrentBytes: number;
      cpuAvgUsage: number;
      cpuMaxUsage: number;
      cpuCurrentUsage: number;
      netRxBytes: number;
      netTxBytes: number;
      durationMillis: number;
      runTimeSecs: number;
      metamorph: number;
      computeUnits: number;
    };
  };
  resource: {
    id: string;
    actId: string;
    userId: string;
  };
}

/**
 * Actual Apify webhook payload structure from dashboard
 * Payload template:
 * {
 *   "platform": "facebook_reviews",
 *   "createdAt": {{createdAt}},
 *   "eventType": {{eventType}},
 *   "eventData": {{eventData}},
 *   "resource": {{resource}}
 * }
 */
export interface ActualApifyWebhookPayload {
  platform: string; // e.g., "facebook_reviews", "google_reviews"
  createdAt: string; // ISO timestamp
  eventType: ApifyEventType | 'TEST'; // Can be TEST for webhook testing
  eventData: {
    actorId: string;
    actorRunId: string;
  } | null; // null for TEST events
  resource: {
    id: string;
    actId: string;
    userId: string;
    startedAt: string;
    finishedAt: string;
    status: 'SUCCEEDED' | 'FAILED' | 'ABORTED';
    statusMessage?: string;
    isStatusMessageTerminal?: boolean;
    defaultKeyValueStoreId: string;
    defaultDatasetId: string;
    defaultRequestQueueId: string;
    exitCode?: number;
    buildId?: string;
    meta?: {
      origin: string;
      userAgent: string;
    };
    stats?: {
      inputBodyLen: number;
      migrationCount: number;
      rebootCount: number;
      restartCount: number;
      durationMillis: number;
      resurrectCount: number;
      runTimeSecs: number;
      metamorph: number;
      computeUnits: number;
      memAvgBytes: number;
      memMaxBytes: number;
      memCurrentBytes: number;
      cpuAvgUsage: number;
      cpuMaxUsage: number;
      cpuCurrentUsage: number;
      netRxBytes: number;
      netTxBytes: number;
    };
    options?: {
      build: string;
      timeoutSecs: number;
      memoryMbytes: number;
      maxTotalChargeUsd: number;
      diskMbytes: number;
    };
    pricingInfo?: any;
    chargedEventCounts?: Record<string, number>;
    platformUsageBillingModel?: string;
    accountedChargedEventCounts?: Record<string, number>;
    generalAccess?: string;
    buildNumber?: string | null;
    containerUrl?: string;
    usageTotalUsd?: number;
    links?: {
      publicRunUrl: string;
      consoleRunUrl: string;
      apiRunUrl: string;
    };
    // For TEST webhooks
    joke?: string;
  };
}

/**
 * Business identifiers for different platforms
 */
export interface BusinessIdentifiers {
  googlePlaceIds?: string[];
  facebookPageUrls?: string[];
  tripAdvisorUrls?: string[];
  bookingUrls?: string[];
}

/**
 * Apify actor input configurations
 * These match the exact input schemas from specialized review scrapers
 */

// Google Maps Reviews Scraper (Xb8osYTtOjlsgI6k9)
export interface GoogleMapsActorInput {
  placeIds: string[];
  maxReviews: number;
  reviewsSort: 'newest' | 'most_relevant';
  language?: string;
  reviewsOrigin?: 'google';  // Only Google reviews (not TripAdvisor etc)
  personalData?: boolean;     // GDPR compliant - default false
  webhooks?: ApifyWebhookConfig[];
}

// Facebook Reviews Scraper (dX3d80hsNMilEwjXG)
export interface FacebookActorInput {
  startUrls: Array<{ url: string }>;
  resultsLimit?: number;      // TOTAL limit for all reviews. Omit for unlimited (all reviews)
  proxy?: {
    apifyProxyGroups?: string[];
  };
  maxRequestRetries?: number;
  webhooks?: ApifyWebhookConfig[];
}

// TripAdvisor Reviews Scraper (Hvp4YfFGyLM635Q2F)
export interface TripAdvisorActorInput {
  startUrls: Array<{ url: string }>;
  maxItemsPerQuery?: number;  // TOTAL limit for reviews per place. Omit for unlimited (all reviews)
  scrapeReviewerInfo?: boolean;
  lastReviewDate?: string;    // YYYY-MM-DD or "3 days"
  reviewRatings?: string[];   // e.g., ["ALL_REVIEW_RATINGS"] or ["4", "5"]
  reviewsLanguages?: string[]; // e.g., ["ALL_REVIEW_LANGUAGES"] or ["en"]
  webhooks?: ApifyWebhookConfig[];
}

// Booking.com Reviews Scraper (PbMHke3jW25J6hSOA)
export interface BookingActorInput {
  startUrls: Array<{ url: string; userData?: any }>;
  maxReviewsPerHotel?: number;  // TOTAL limit for reviews per hotel. Omit for unlimited (all reviews)
  sortReviewsBy?: 'f_relevance' | 'f_recent_desc' | 'f_recent_asc' | 'f_score_desc' | 'f_score_asc';
  cutoffDate?: string;         // UTC date for stopping scrape
  reviewScores?: string[];     // e.g., ["ALL"] or ["review_adj_superb", "review_adj_good"]
  proxyConfiguration?: {
    useApifyProxy?: boolean;
  };
  webhooks?: ApifyWebhookConfig[];
}

export interface ApifyWebhookConfig {
  eventTypes: ApifyEventType[];
  requestUrl: string;
  payloadTemplate?: string;
}

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
  platform: Platform;
  scheduleType: ScheduleType;
  identifiers: string[];
  cronExpression: string;
  intervalHours: number;
  maxReviewsPerRun: number;
  webhookUrl: string;
}

/**
 * Task run configuration
 */
export interface TaskRunConfig {
  platform: Platform;
  identifiers: string[];
  isInitial: boolean;
  maxReviews: number;
  webhookUrl: string;
}

/**
 * Apify schedule info
 */
export interface ApifyScheduleInfo {
  id: string;
  apifyScheduleId: string;
  platform: Platform;
  scheduleType: ScheduleType;
  cronExpression: string;
  nextRun: Date;
  isActive: boolean;
}

/**
 * Sync result
 */
export interface SyncResult {
  reviewsProcessed: number;
  reviewsNew: number;
  reviewsDuplicate: number;
  businessesUpdated: number;
  processingTimeMs: number;
}

/**
 * Task run result
 */
export interface TaskRunResult {
  apifyRunId: string;
  status: 'pending' | 'running';
  startedAt: Date;
  estimatedCompletion?: Date;
}

