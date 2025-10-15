/**
 * Feature Extractor Service
 * Extracts features and limits from Stripe subscription using FeatureChecker
 * Also handles custom intervals for Enterprise/special teams
 */

import { FeatureChecker, ProductFeaturesService, StripeFeatureLookupKeys, StripeService } from '@wirecrest/billing/server-only';
import { prisma } from '@wirecrest/db';
import type {
  ExtractedFeatures,
  SubscriptionTier,
  PlatformFeatures,
  SubscriptionLimits,
  TIER_SCHEDULE_CONFIGS,
} from '../../types/subscription.types';
import type { Platform } from '../../types/apify.types';

// Lazy initialization of feature checker
let featureChecker: FeatureChecker | null = null;

function getFeatureChecker(): FeatureChecker {
  if (!featureChecker) {
    const productFeaturesService = new ProductFeaturesService();
    featureChecker = new FeatureChecker(productFeaturesService);
  }
  return featureChecker;
}

export class FeatureExtractor {
  /**
   * Extract features from team subscription using FeatureChecker
   */
  async extractTeamFeatures(teamId: string): Promise<ExtractedFeatures> {
    // Get enabled features from FeatureChecker (with Stripe integration and Redis caching)
    const enabledFeaturesSet = await getFeatureChecker().getTeamFeatures(teamId);
    
    // Convert Set to array for compatibility
    const enabledFeatures = Array.from(enabledFeaturesSet);
    
    // Convert to a map for easier access
    const featureMap: Record<string, boolean> = {};
    enabledFeatures.forEach((feature: string) => {
      featureMap[feature] = true;
    });

    // Determine tier based on features
    const tier = this.determineTier(featureMap);

    // Extract platform features using StripeFeatureLookupKeys
    const platforms: PlatformFeatures = {
      googleReviews: featureMap[StripeFeatureLookupKeys.GOOGLE_REVIEWS] === true,
      facebook: featureMap[StripeFeatureLookupKeys.FACEBOOK_REVIEWS] === true,
      tripadvisor: featureMap[StripeFeatureLookupKeys.TRIPADVISOR_REVIEWS] === true,
      booking: featureMap[StripeFeatureLookupKeys.BOOKING_REVIEWS] === true,
    };

    // Extract limits based on tier (with Stripe as source of truth)
    const limits = await this.extractLimits(teamId, featureMap, tier);

    return {
      tier,
      platforms,
      limits,
    };
  }

  /**
   * Determine subscription tier from features
   */
  private determineTier(features: Record<string, any>): SubscriptionTier {
    // Check for enterprise features
    if (
      features['reviews.google'] &&
      features['reviews.facebook'] &&
      features['reviews.tripadvisor'] &&
      features['reviews.booking'] &&
      features['reviews.unlimited']
    ) {
      return 'enterprise';
    }

    // Check for professional features
    if (
      features['reviews.google'] &&
      (features['reviews.facebook'] || features['reviews.tripadvisor'])
    ) {
      return 'professional';
    }

    // Default to starter
    return 'starter';
  }

  /**
   * Get subscription limits from Stripe product metadata
   * This is the source of truth for limits
   */
  private async getStripeLimits(teamId: string): Promise<Partial<SubscriptionLimits> | null> {
    try {
      // Get team's Stripe subscription
      const subscription = await prisma.teamSubscription.findUnique({
        where: { teamId },
        select: { stripeSubscriptionId: true, stripeProductId: true },
      });

      if (!subscription?.stripeProductId) {
        return null;
      }

      // Get product with metadata from Stripe
      const stripe = StripeService.getStripeInstance();
      const product = await stripe.products.retrieve(subscription.stripeProductId);
      
      // Parse limits from metadata
      const limits: Partial<SubscriptionLimits> = {};
      
      if (product.metadata.maxReviewsPerBusiness) {
        limits.maxReviewsPerBusiness = parseInt(product.metadata.maxReviewsPerBusiness);
      }
      if (product.metadata.maxBusinessLocations) {
        limits.maxBusinessLocations = parseInt(product.metadata.maxBusinessLocations);
      }
      if (product.metadata.reviewsScrapeIntervalHours) {
        limits.reviewsScrapeIntervalHours = parseInt(product.metadata.reviewsScrapeIntervalHours);
      }
      if (product.metadata.overviewScrapeIntervalHours) {
        limits.overviewScrapeIntervalHours = parseInt(product.metadata.overviewScrapeIntervalHours);
      }
      if (product.metadata.historicalDataMonths) {
        limits.historicalDataMonths = parseInt(product.metadata.historicalDataMonths);
      }
      if (product.metadata.concurrentScrapes) {
        limits.concurrentScrapes = parseInt(product.metadata.concurrentScrapes);
      }
      
      return limits;
    } catch (error) {
      console.error('Failed to get Stripe limits:', error);
      return null;
    }
  }

  /**
   * Extract subscription limits
   * Priority: Stripe metadata > Feature flags > Hardcoded tier defaults
   */
  private async extractLimits(teamId: string, features: Record<string, any>, tier: SubscriptionTier): Promise<SubscriptionLimits> {
    // Get limits from Stripe (source of truth)
    const stripeLimits = await this.getStripeLimits(teamId);
    // Base limits by tier
    const tierLimits: Record<SubscriptionTier, SubscriptionLimits> = {
      starter: {
        maxReviewsPerBusiness: 500,
        maxBusinessLocations: 1,
        reviewsScrapeIntervalHours: 24,
        overviewScrapeIntervalHours: 48,
        historicalDataMonths: 3,
        concurrentScrapes: 1,
      },
      professional: {
        maxReviewsPerBusiness: 2000,
        maxBusinessLocations: 5,
        reviewsScrapeIntervalHours: 12,
        overviewScrapeIntervalHours: 24,
        historicalDataMonths: 6,
        concurrentScrapes: 3,
      },
      enterprise: {
        maxReviewsPerBusiness: 10000,
        maxBusinessLocations: 999,
        reviewsScrapeIntervalHours: 6,
        overviewScrapeIntervalHours: 12,
        historicalDataMonths: 24,
        concurrentScrapes: 10,
      },
    };

    const baseLimits = tierLimits[tier];

    // Priority: Stripe > Feature flags > Hardcoded defaults
    return {
      maxReviewsPerBusiness:
        stripeLimits?.maxReviewsPerBusiness ||
        features['reviews.maxPerBusiness'] ||
        baseLimits.maxReviewsPerBusiness,
      maxBusinessLocations:
        stripeLimits?.maxBusinessLocations ||
        features['reviews.maxLocations'] ||
        baseLimits.maxBusinessLocations,
      reviewsScrapeIntervalHours:
        stripeLimits?.reviewsScrapeIntervalHours ||
        features['reviews.scrapeInterval'] ||
        baseLimits.reviewsScrapeIntervalHours,
      overviewScrapeIntervalHours:
        stripeLimits?.overviewScrapeIntervalHours ||
        features['overview.scrapeInterval'] ||
        baseLimits.overviewScrapeIntervalHours,
      historicalDataMonths:
        stripeLimits?.historicalDataMonths ||
        baseLimits.historicalDataMonths,
      concurrentScrapes:
        stripeLimits?.concurrentScrapes ||
        baseLimits.concurrentScrapes,
    };
  }

  /**
   * Check if a platform is enabled for a team
   */
  async isPlatformEnabled(teamId: string, platform: string): Promise<boolean> {
    const features = await this.extractTeamFeatures(teamId);
    
    switch (platform) {
      case 'google_reviews':
        return features.platforms.googleReviews;
      case 'facebook':
        return features.platforms.facebook;
      case 'tripadvisor':
        return features.platforms.tripadvisor;
      case 'booking':
        return features.platforms.booking;
      default:
        return false;
    }
  }

  /**
   * Get enabled platforms for a team
   */
  async getEnabledPlatforms(teamId: string): Promise<string[]> {
    const features = await this.extractTeamFeatures(teamId);
    const platforms: string[] = [];

    if (features.platforms.googleReviews) platforms.push('google_reviews');
    if (features.platforms.facebook) platforms.push('facebook');
    if (features.platforms.tripadvisor) platforms.push('tripadvisor');
    if (features.platforms.booking) platforms.push('booking');

    return platforms;
  }

  /**
   * Get interval for a team's platform (checks custom intervals first)
   * Returns custom interval if set, otherwise returns tier-based default
   */
  async getIntervalForTeamPlatform(
    teamId: string,
    platform: Platform,
    scheduleType: 'reviews' | 'overview' = 'reviews'
  ): Promise<number> {
    // Check for custom interval
    const customInterval = await prisma.scheduleCustomInterval.findUnique({
      where: {
        teamId_platform: {
          teamId,
          platform,
        },
      },
    });

    // Check if custom interval is still valid
    if (customInterval) {
      if (!customInterval.expiresAt || customInterval.expiresAt > new Date()) {
        console.log(`✓ Using custom interval ${customInterval.customIntervalHours}h for team ${teamId} on ${platform}`);
        return customInterval.customIntervalHours;
      } else {
        console.log(`⚠️  Custom interval expired for team ${teamId} on ${platform}, using default`);
        // Could optionally delete expired custom interval here
      }
    }

    // Fallback to tier-based interval
    const features = await this.extractTeamFeatures(teamId);
    
    if (scheduleType === 'reviews') {
      return features.limits.reviewsScrapeIntervalHours;
    } else {
      return features.limits.overviewScrapeIntervalHours;
    }
  }

  /**
   * Set custom interval for a team's platform (admin function)
   */
  async setCustomInterval(
    teamId: string,
    platform: Platform,
    customIntervalHours: number,
    reason: string,
    setBy: string,
    expiresAt?: Date
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate interval
      if (customIntervalHours < 1 || customIntervalHours > 168) {
        return {
          success: false,
          message: 'Invalid interval: must be between 1 and 168 hours',
        };
      }

      // Upsert custom interval
      await prisma.scheduleCustomInterval.upsert({
        where: {
          teamId_platform: {
            teamId,
            platform,
          },
        },
        create: {
          teamId,
          platform,
          customIntervalHours,
          reason,
          setBy,
          expiresAt,
        },
        update: {
          customIntervalHours,
          reason,
          setBy,
          expiresAt,
        },
      });

      console.log(`✓ Set custom interval ${customIntervalHours}h for team ${teamId} on ${platform}`);

      return {
        success: true,
        message: `Custom interval set to ${customIntervalHours}h`,
      };
    } catch (error: any) {
      console.error('Error setting custom interval:', error);
      return {
        success: false,
        message: `Failed: ${error.message}`,
      };
    }
  }

  /**
   * Remove custom interval for a team's platform
   */
  async removeCustomInterval(
    teamId: string,
    platform: Platform
  ): Promise<{ success: boolean; message: string }> {
    try {
      await prisma.scheduleCustomInterval.delete({
        where: {
          teamId_platform: {
            teamId,
            platform,
          },
        },
      });

      console.log(`✓ Removed custom interval for team ${teamId} on ${platform}`);

      return {
        success: true,
        message: 'Custom interval removed',
      };
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Record not found
        return {
          success: true,
          message: 'No custom interval set',
        };
      }

      console.error('Error removing custom interval:', error);
      return {
        success: false,
        message: `Failed: ${error.message}`,
      };
    }
  }

  /**
   * Get all custom intervals for a team
   */
  async getTeamCustomIntervals(teamId: string): Promise<Array<{
    platform: string;
    customIntervalHours: number;
    reason: string | null;
    setBy: string | null;
    expiresAt: Date | null;
  }>> {
    return prisma.scheduleCustomInterval.findMany({
      where: { teamId },
    });
  }
}

