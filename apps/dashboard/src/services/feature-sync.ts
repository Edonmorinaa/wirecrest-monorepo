/**
 * Feature Sync Service
 * 
 * Handles fetching and caching features when users log in or subscriptions update.
 * This service should be called during login and subscription change events.
 */

import { prisma } from '@wirecrest/db';
import {
  createProductFeaturesService,
  createFeatureChecker,
  StripeService,
} from '@wirecrest/billing';

// Initialize the product features service
const productFeaturesService = createProductFeaturesService({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
});

const featureChecker = createFeatureChecker(productFeaturesService);

/**
 * Sync features for a team when they log in or subscription changes
 * This should be called during login and subscription update events
 */
export async function syncTeamFeatures(teamId: string): Promise<{
  success: boolean;
  features: string[];
  productId?: string;
  error?: string;
}> {
  try {
    console.log(`🔄 Syncing features for team: ${teamId}`);
    
    // Get team's active subscription
    const subscription = await prisma.teamSubscription.findFirst({
      where: {
        teamId,
        status: {
          in: ['ACTIVE', 'TRIALING'],
        },
      },
      select: {
        stripeProductId: true,
        status: true,
      },
    });

    if (!subscription || !subscription.stripeProductId) {
      console.log(`❌ No active subscription found for team: ${teamId}`);
      return {
        success: false,
        features: [],
        error: 'No active subscription found',
      };
    }

    // Get current subscription using StripeService
    const stripeService = new StripeService();
    const { productId } = await stripeService.getCurrentSubscription(team.stripeCustomerId);

    if (!productId) {
      console.log(`❌ No active subscription found for team: ${teamId}`);
      return {
        success: false,
        features: [],
        error: 'No active subscription found',
      };
    }

    console.log(`📦 Found subscription with product: ${productId}`);

    // Fetch features for this product (this will cache them)
    const features = await productFeaturesService.getProductFeatures(productId);
    const featureArray = Array.from(features);

    console.log(`✅ Synced features for team ${teamId}:`, featureArray);
    console.log(`📦 Product ID: ${subscription.stripeProductId}`);

    return {
      success: true,
      features: featureArray,
      productId: subscription.stripeProductId,
    };
  } catch (error) {
    console.error('❌ Error syncing team features:', error);
    return {
      success: false,
      features: [],
      error: `Failed to sync features: ${error}`,
    };
  }
}

/**
 * Sync features for multiple teams
 */
export async function syncMultipleTeamFeatures(teamIds: string[]): Promise<{
  success: boolean;
  results: Array<{
    teamId: string;
    success: boolean;
    features: string[];
    productId?: string;
    error?: string;
  }>;
}> {
  const results = await Promise.all(
    teamIds.map(async (teamId) => {
      const result = await syncTeamFeatures(teamId);
      return {
        teamId,
        ...result,
      };
    })
  );

  const success = results.every(r => r.success);

  return {
    success,
    results,
  };
}

/**
 * Get cached features for a team (without API calls)
 */
export async function getCachedTeamFeatures(teamId: string): Promise<{
  success: boolean;
  features: string[];
  productId?: string;
  error?: string;
}> {
  try {
    // Get team's active subscription
    const subscription = await prisma.teamSubscription.findFirst({
      where: {
        teamId,
        status: {
          in: ['ACTIVE', 'TRIALING'],
        },
      },
      select: {
        stripeProductId: true,
        status: true,
      },
    });

    if (!subscription || !subscription.stripeProductId) {
      return {
        success: false,
        features: [],
        error: 'No active subscription found',
      };
    }

    // Get cached features (this won't make API calls if cached)
    const features = await productFeaturesService.getProductFeatures(subscription.stripeProductId);
    const featureArray = Array.from(features);

    return {
      success: true,
      features: featureArray,
      productId: subscription.stripeProductId,
    };
  } catch (error) {
    console.error('Error getting cached team features:', error);
    return {
      success: false,
      features: [],
      error: 'Failed to get cached features',
    };
  }
}

/**
 * Invalidate cache for a team (call when subscription changes)
 */
export async function invalidateTeamFeatureCache(teamId: string): Promise<void> {
  try {
    await featureChecker.invalidateTeamCache(teamId);
    console.log(`Invalidated feature cache for team: ${teamId}`);
  } catch (error) {
    console.error('Error invalidating team feature cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getFeatureCacheStats() {
  return productFeaturesService.getCacheStats();
}

/**
 * Clear all feature caches
 */
export function clearAllFeatureCaches(): void {
  productFeaturesService.clearCache();
  console.log('Cleared all feature caches');
}
