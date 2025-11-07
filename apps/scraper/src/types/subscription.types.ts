/**
 * Subscription and Feature Type Definitions
 */

import type { Platform } from "./apify.types";

export type SubscriptionTier = "starter" | "professional" | "enterprise";

export type SubscriptionStatus =
  | "active"
  | "paused"
  | "cancelled"
  | "past_due"
  | "trialing";

/**
 * Extracted features from Stripe subscription
 */
export interface ExtractedFeatures {
  tier: SubscriptionTier;
  platforms: PlatformFeatures;
  limits: SubscriptionLimits;
}

/**
 * Platform feature flags
 */
export interface PlatformFeatures {
  googleReviews: boolean;
  facebook: boolean;
  tripadvisor: boolean;
  booking: boolean;
}

/**
 * Subscription limits based on tier
 */
export interface SubscriptionLimits {
  maxReviewsPerBusiness: number; // e.g., 2000 for Pro
  maxBusinessLocations: number; // e.g., 5 for Starter
  reviewsScrapeIntervalHours: number; // e.g., 12 hours
  overviewScrapeIntervalHours: number; // e.g., 24 hours
  historicalDataMonths: number; // e.g., 6 months
  concurrentScrapes: number; // e.g., 3
}

/**
 * Tier-based schedule configuration
 */
export interface TierScheduleConfig {
  tier: SubscriptionTier;
  reviews: {
    intervalHours: number;
    maxReviewsPerBusiness: number;
    cronExpression: string;
  };
  overview: {
    intervalHours: number;
    cronExpression: string;
  };
}

/**
 * Platform to feature key mapping
 */
export const PLATFORM_FEATURE_MAP: Record<Platform, string> = {
  google_reviews: "reviews.google",
  facebook: "reviews.facebook",
  tripadvisor: "reviews.tripadvisor",
  booking: "reviews.booking",
};

/**
 * Tier-based schedule configurations
 */
export const TIER_SCHEDULE_CONFIGS: Record<
  SubscriptionTier,
  TierScheduleConfig
> = {
  starter: {
    tier: "starter",
    reviews: {
      intervalHours: 24,
      maxReviewsPerBusiness: 50,
      cronExpression: "0 9 * * *", // 9 AM daily
    },
    overview: {
      intervalHours: 48,
      cronExpression: "0 10 */2 * *", // 10 AM every 2 days
    },
  },
  professional: {
    tier: "professional",
    reviews: {
      intervalHours: 12,
      maxReviewsPerBusiness: 100,
      cronExpression: "0 */12 * * *", // Every 12 hours
    },
    overview: {
      intervalHours: 24,
      cronExpression: "0 10 * * *", // 10 AM daily
    },
  },
  enterprise: {
    tier: "enterprise",
    reviews: {
      intervalHours: 6,
      maxReviewsPerBusiness: 200,
      cronExpression: "0 */6 * * *", // Every 6 hours
    },
    overview: {
      intervalHours: 12,
      cronExpression: "0 */12 * * *", // Every 12 hours
    },
  },
};
