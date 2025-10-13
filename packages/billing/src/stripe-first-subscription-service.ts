/**
 * Stripe-First Subscription Service
 * Fetches subscription data from Stripe (single source of truth)
 * with Redis caching and database admin overrides
 */

import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';
import { /* SubscriptionCacheService, */ CachedSubscription } from './redis-subscription-cache';
import { StripeService } from './stripe-service';

export class StripeFirstSubscriptionService {
  private stripe: Stripe;
  // private cache: SubscriptionCacheService; // REDIS DISABLED - uncomment to re-enable

  constructor() {
    this.stripe = StripeService.getStripeInstance();
    // this.cache = new SubscriptionCacheService(); // REDIS DISABLED - uncomment to re-enable
  }

  /**
   * Get team subscription - always from Stripe (NO CACHE for now)
   * This is the main method that everything should use
   */
  async getTeamSubscription(teamId: string): Promise<CachedSubscription> {
    // REDIS DISABLED - uncomment to re-enable caching
    // const cached = await this.cache.get(teamId);
    // if (cached) {
    //   return cached;
    // }

    console.log(`🔍 [Stripe-First] Fetching subscription for team ${teamId} from Stripe (NO CACHE)`);

    // Get team to find stripeCustomerId
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { stripeCustomerId: true },
    });

    if (!team?.stripeCustomerId) {
      console.log(`ℹ️ [Stripe-First] No Stripe customer for team ${teamId}, returning FREE tier`);
      return this.getFreeTierDefaults(teamId);
    }

    // Fetch active subscription from Stripe (expand only to 3 levels to avoid Stripe limit)
    const subscriptions = await this.stripe.subscriptions.list({
      customer: team.stripeCustomerId,
      status: 'active',
      limit: 1,
      expand: ['data.items.data.price'], // Only 3 levels: data > items > data > price
    });

    if (subscriptions.data.length === 0) {
      console.log(`ℹ️ [Stripe-First] No active subscription for team ${teamId}, returning FREE tier`);
      return this.getFreeTierDefaults(teamId);
    }

    const subscription: Stripe.Subscription = subscriptions.data[0];
    
    if (!subscription.items?.data?.length) {
      console.warn(`⚠️ [Stripe-First] No subscription items found for subscription ${subscription.id}`);
      return this.getFreeTierDefaults(teamId);
    }
    
    const price = subscription.items.data[0].price;
    const priceId = price.id;
    
    // Fetch product separately to avoid expansion depth limit
    const productId = typeof price.product === 'string' ? price.product : price.product?.id;
    if (!productId) {
      console.warn(`⚠️ [Stripe-First] No product ID found for subscription ${subscription.id}, price ${priceId}`);
      return this.getFreeTierDefaults(teamId);
    }
    
    console.log(`📦 [Stripe-First] Fetching product ${productId} for subscription ${subscription.id}`);
    const product = await this.stripe.products.retrieve(productId);

    console.log(`✅ [Stripe-First] Found subscription ${subscription.id} for team ${teamId}`);

    // Extract tier configuration from Stripe product metadata
    const tierFromMetadata = this.extractTierFromProduct(product);

    // Check for admin overrides in database (lookup by tier, not priceId)
    const tierConfig = tierFromMetadata.tier ? await prisma.subscriptionTierConfig.findFirst({
      where: { tier: tierFromMetadata.tier as any },
    }) : null;

    if (tierConfig) {
      console.log(`🔧 [Stripe-First] Found admin override config for tier ${tierConfig.tier}`);
    }

    // Merge Stripe metadata with database overrides (DB overrides win)
    const mergedConfig: CachedSubscription = {
      tier: tierConfig?.tier || tierFromMetadata.tier || 'STARTER',
      status: subscription.status.toUpperCase(),
      stripeSubscriptionId: subscription.id,
      enabledFeatures: tierConfig?.enabledFeatures || tierFromMetadata.enabledFeatures || [],
      includedSeats: tierConfig?.includedSeats || tierFromMetadata.includedSeats || 1,
      includedLocations: tierConfig?.includedLocations || tierFromMetadata.includedLocations || 1,
      includedRefreshes: tierConfig?.includedRefreshes || tierFromMetadata.includedRefreshes || 24,
      currentPeriodEnd: subscription.days_until_due 
        ? new Date(Date.now() + subscription.days_until_due * 24 * 60 * 60 * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cachedAt: new Date(),
    };

    console.log(`✅ [Stripe-First] Fetched subscription for team ${teamId}:`, {
      tier: mergedConfig.tier,
      status: mergedConfig.status,
      features: mergedConfig.enabledFeatures.length,
    });

    // REDIS DISABLED - uncomment to re-enable caching
    // await this.cache.set(teamId, mergedConfig);

    return mergedConfig;
  }

  /**
   * Check if team has specific feature access
   */
  async hasFeatureAccess(teamId: string, feature: string): Promise<boolean> {
    const subscription = await this.getTeamSubscription(teamId);
    const hasAccess = subscription.enabledFeatures.includes(feature);
    
    console.log(`🔐 [Feature Check] Team ${teamId} ${feature}: ${hasAccess ? '✅' : '❌'}`);
    
    return hasAccess;
  }

  /**
   * Check multiple features at once
   */
  async checkFeatures(teamId: string, features: string[]): Promise<Record<string, boolean>> {
    const subscription = await this.getTeamSubscription(teamId);
    
    const result: Record<string, boolean> = {};
    for (const feature of features) {
      result[feature] = subscription.enabledFeatures.includes(feature);
    }

    console.log(`🔐 [Feature Check] Team ${teamId} checked ${features.length} features`);
    
    return result;
  }

  /**
   * Get subscription info formatted for UI
   */
  async getSubscriptionInfo(teamId: string) {
    const subscription = await this.getTeamSubscription(teamId);

    return {
      tier: subscription.tier,
      status: subscription.status,
      enabledFeatures: subscription.enabledFeatures,
      subscription: subscription.stripeSubscriptionId ? {
        id: subscription.stripeSubscriptionId,
        status: subscription.status.toLowerCase(),
        currentPeriodEnd: subscription.currentPeriodEnd ? Math.floor(subscription.currentPeriodEnd.getTime() / 1000) : 0,
        currentPeriodStart: subscription.currentPeriodEnd ? Math.floor(subscription.currentPeriodEnd.getTime() / 1000) - (30 * 24 * 60 * 60) : 0, // Approximate
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      } : undefined,
    };
  }

  /**
   * Invalidate cache (called by webhooks)
   * REDIS DISABLED - no-op for now
   */
  async invalidateTeamCache(teamId: string): Promise<void> {
    console.log(`🗑️ [Stripe-First] Cache invalidation skipped (Redis disabled) for team ${teamId}`);
    // REDIS DISABLED - uncomment to re-enable
    // await this.cache.invalidate(teamId);
  }

  /**
   * Invalidate all caches (useful for admin operations)
   * REDIS DISABLED - no-op for now
   */
  async invalidateAllCaches(): Promise<void> {
    console.log(`🗑️ [Stripe-First] Cache invalidation skipped (Redis disabled)`);
    // REDIS DISABLED - uncomment to re-enable
    // await this.cache.invalidateAll();
  }

  /**
   * Extract tier configuration from Stripe product metadata
   */
  private extractTierFromProduct(product: Stripe.Product) {
    const metadata = product.metadata;

    let enabledFeatures: string[] = [];
    
    // Try to parse enabledFeatures from metadata
    if (metadata.enabledFeatures) {
      try {
        enabledFeatures = JSON.parse(metadata.enabledFeatures);
      } catch {
        // If not JSON, try comma-separated
        enabledFeatures = metadata.enabledFeatures.split(',').map(f => f.trim());
      }
    }

    return {
      tier: metadata.tier || 'STARTER',
      enabledFeatures,
      includedSeats: metadata.includedSeats 
        ? parseInt(metadata.includedSeats, 10) 
        : 1,
      includedLocations: metadata.includedLocations 
        ? parseInt(metadata.includedLocations, 10) 
        : 1,
      includedRefreshes: metadata.includedRefreshes 
        ? parseInt(metadata.includedRefreshes, 10) 
        : 24,
    };
  }

  /**
   * Get FREE tier defaults (no Stripe subscription)
   */
  private async getFreeTierDefaults(teamId: string): Promise<CachedSubscription> {
    // Check if there's a FREE tier config in database
    const freeConfig = await prisma.subscriptionTierConfig.findFirst({
      where: { tier: 'FREE' },
    });

    const freeSubscription: CachedSubscription = {
      tier: 'FREE',
      status: 'ACTIVE',
      stripeSubscriptionId: null,
      enabledFeatures: freeConfig?.enabledFeatures || ['google_reviews_access', 'facebook_reviews_access'],
      includedSeats: freeConfig?.includedSeats || 1,
      includedLocations: freeConfig?.includedLocations || 1,
      includedRefreshes: freeConfig?.includedRefreshes || 6,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      cachedAt: new Date(),
    };

    // REDIS DISABLED - uncomment to re-enable caching
    // await this.cache.set(teamId, freeSubscription);

    return freeSubscription;
  }

  /**
   * Force refresh subscription from Stripe
   * REDIS DISABLED - just fetches normally (no cache to invalidate)
   */
  async refreshSubscription(teamId: string): Promise<CachedSubscription> {
    // REDIS DISABLED - uncomment to re-enable
    // await this.cache.invalidate(teamId);
    return await this.getTeamSubscription(teamId);
  }
}

// Singleton instance
let globalService: StripeFirstSubscriptionService | null = null;

/**
 * Get global StripeFirstSubscriptionService instance
 */
export function getGlobalStripeFirstService(): StripeFirstSubscriptionService {
  if (!globalService) {
    globalService = new StripeFirstSubscriptionService();
  }
  return globalService;
}

