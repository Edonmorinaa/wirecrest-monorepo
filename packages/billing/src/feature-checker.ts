/**
 * Feature Checker
 * 
 * Gets consumerId from team, finds active subscription, checks product features.
 * Clean and simple.
 */

import { prisma } from '@wirecrest/db';
import { StripeFeatureLookupKey } from './stripe-features';
import { ProductFeaturesService } from './product-features';
import { StripeService } from './stripe-service';
import { getGlobalRedisCache } from './redis-cache';

export interface FeatureCheckResult {
  hasAccess: boolean;
  reason?: string;
}

export class FeatureChecker {
  private stripeService: StripeService;
  private redisCache = getGlobalRedisCache();
  public readonly instanceId: string;

  constructor(
    private productFeaturesService: ProductFeaturesService
  ) {
    this.stripeService = new StripeService();
    this.instanceId = Math.random().toString(36).substr(2, 9);
    console.log(`🔧 FeatureChecker instance created with ID: ${this.instanceId}`);
  }

  /**
   * Check if a team has access to a feature
   */
  async checkFeature(productId: string, featureKey: StripeFeatureLookupKey): Promise<FeatureCheckResult> {
    try {

      // Check if product has the feature
      const hasFeature = await this.productFeaturesService.productHasFeature(
        productId,
        featureKey
      );

      console.log(`🎯 Feature ${featureKey} access:`, hasFeature);

      return {
        hasAccess: hasFeature,
        reason: hasFeature ? undefined : 'Feature not included in plan',
      };
    } catch (error) {
      console.error('❌ Error checking feature:', error);
      return {
        hasAccess: false,
        reason: 'Error checking feature access',
      };
    }
  }

  /**
   * Get all features a team has access to (with Redis caching)
   */
  async getTeamFeatures(teamId: string): Promise<Set<StripeFeatureLookupKey>> {
    try {
      console.log(`🔍 Getting all features for team ${teamId} (FeatureChecker instance ID: ${this.instanceId})`);
      
      // Check Redis cache first
      // const cached = await this.redisCache.getTeamFeatures(teamId);
      // if (cached) {
      //   return cached;
      // }
      
      // Get team's consumerId
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { stripeCustomerId: true },
      });

      if (!team?.stripeCustomerId) {
        console.log('❌ No Stripe customer ID found for team');
        return new Set();
      }

      // Get current subscription using StripeService
      const { productId } = await this.stripeService.getCurrentSubscription(team.stripeCustomerId);

      if (!productId) {
        console.log('❌ No active subscription found');
        return new Set();
      }

      // Get features from product
      const features = await this.productFeaturesService.getProductFeatures(productId);
      console.log('✅ Team features:', Array.from(features));
      
      // Cache the result in Redis
      await this.redisCache.setTeamFeatures(teamId, features);
      
      return features;
    } catch (error) {
      console.error('❌ Error getting team features:', error);
      return new Set();
    }
  }

  /**
   * Clear cache for a specific team (useful when subscription changes)
   */
  async clearTeamCache(teamId: string): Promise<void> {
    await this.redisCache.clearTeamCache(teamId);
  }

  /**
   * Clear all cached features
   */
  async clearAllCache(): Promise<void> {
    await this.redisCache.clearAllCache();
  }

  /**
   * Check multiple features for a team
   */
  async checkFeatures(teamId: string, featureKeys: StripeFeatureLookupKey[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const featureKey of featureKeys) {
      try {
        // Get team's current subscription to get product ID
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          select: { stripeCustomerId: true },
        });

        if (!team?.stripeCustomerId) {
          results[featureKey] = false;
          continue;
        }

        // Get current subscription using StripeService
        const { productId } = await this.stripeService.getCurrentSubscription(team.stripeCustomerId);

        if (!productId) {
          results[featureKey] = false;
          continue;
        }

        // Check if product has the feature
        const hasFeature = await this.productFeaturesService.productHasFeature(productId, featureKey);
        results[featureKey] = hasFeature;
      } catch (error) {
        console.error(`Error checking feature ${featureKey}:`, error);
        results[featureKey] = false;
      }
    }
    
    return results;
  }
}

/**
 * Factory function
 */
export function createFeatureChecker(
  productFeaturesService: ProductFeaturesService
): FeatureChecker {
  return new FeatureChecker(productFeaturesService);
}

// Singleton instance for global cache sharing
let globalFeatureChecker: FeatureChecker | null = null;

/**
 * Get or create the global FeatureChecker instance
 * This ensures cache is shared between webhook handlers and application code
 */
export function getGlobalFeatureChecker(): FeatureChecker {
  if (!globalFeatureChecker) {
    console.log('🌍 Creating global FeatureChecker instance');
    // Create a default ProductFeaturesService if none exists
    const productFeaturesService = new ProductFeaturesService({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    });
    globalFeatureChecker = new FeatureChecker(productFeaturesService);
    console.log('🌍 Global FeatureChecker instance created with ID:', globalFeatureChecker.instanceId);
  } else {
    console.log('🌍 Using existing global FeatureChecker instance with ID:', globalFeatureChecker.instanceId);
  }
  return globalFeatureChecker;
}

/**
 * Force reset the global instance (useful for testing)
 */
export function resetGlobalFeatureChecker(): void {
  console.log('🔄 Resetting global FeatureChecker instance');
  globalFeatureChecker = null;
}

/**
 * Set the global FeatureChecker instance (useful for testing or custom configuration)
 */
export function setGlobalFeatureChecker(checker: FeatureChecker): void {
  globalFeatureChecker = checker;
}
