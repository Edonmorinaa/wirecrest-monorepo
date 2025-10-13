/**
 * Feature Access Service - Stripe-Driven
 * Single source of truth for feature access control
 */


import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';
import { FeatureFlag, ALL_FEATURES } from './feature-flags';
import { StripeService } from './stripe-service';

export interface FeatureAccessResult {
  hasAccess: boolean;
  features: string[];
  tier: string;
  subscriptionId?: string;
  error?: string;
}

export interface FeatureCheckResult {
  [key: string]: boolean;
}

export class FeatureAccessService {
  private _stripe: Stripe | null = null;
  private cache: Map<string, { features: string[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Don't initialize Stripe instance in constructor
    // It will be created lazily when needed
  }

  private get stripe(): Stripe {
    if (!this._stripe) {
      this._stripe = StripeService.getStripeInstance();
    }
    return this._stripe;
  }

  /**
   * Get team's enabled features from Stripe
   */
  async getTeamFeatures(teamId: string): Promise<string[]> {
    // Check cache first
    const cached = this.getCachedFeatures(teamId);
    if (cached) {
      return cached;
    }

    try {
      // Get team's active subscription
      const subscription = await this.getTeamSubscription(teamId);
      if (!subscription) {
        return [];
      }

      // Get product metadata from Stripe
      const product = await this.stripe.products.retrieve(subscription.productId);
      const features = JSON.parse(product.metadata.featureFlags || '[]');
      
      // Cache the result
      this.setCachedFeatures(teamId, features);
      
      return features;
    } catch (error) {
      console.error('Failed to get team features:', error);
      return [];
    }
  }

  /**
   * Check if team has specific feature
   */
  async hasFeature(teamId: string, feature: FeatureFlag): Promise<boolean> {
    const features = await this.getTeamFeatures(teamId);
    return features.includes(feature);
  }

  /**
   * Check multiple features at once
   */
  async hasFeatures(teamId: string, features: FeatureFlag[]): Promise<FeatureCheckResult> {
    const teamFeatures = await this.getTeamFeatures(teamId);
    return features.reduce((acc, feature) => {
      acc[feature] = teamFeatures.includes(feature);
      return acc;
    }, {} as FeatureCheckResult);
  }

  /**
   * Get comprehensive feature access result
   */
  async getFeatureAccess(teamId: string): Promise<FeatureAccessResult> {
    try {
      const subscription = await this.getTeamSubscription(teamId);
      if (!subscription) {
        return {
          hasAccess: false,
          features: [],
          tier: 'FREE',
          error: 'No active subscription found'
        };
      }

      const features = await this.getTeamFeatures(teamId);
      
      return {
        hasAccess: true,
        features,
        tier: subscription.tier,
        subscriptionId: subscription.stripeSubscriptionId
      };
    } catch (error) {
      return {
        hasAccess: false,
        features: [],
        tier: 'FREE',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if team can access a specific platform
   */
  async canAccessPlatform(teamId: string, platform: string): Promise<boolean> {
    const platformFeatureMap: Record<string, FeatureFlag> = {
      'google': 'google_reviews' as FeatureFlag,
      'facebook': 'facebook_reviews' as FeatureFlag,
      'tripadvisor': 'tripadvisor_reviews' as FeatureFlag,
      'booking': 'booking_reviews' as FeatureFlag,
      'yelp': 'yelp_reviews' as FeatureFlag,
    };

    const feature = platformFeatureMap[platform.toLowerCase()];
    if (!feature) {
      return false;
    }

    return await this.hasFeature(teamId, feature);
  }

  /**
   * Check if team can perform multi-location operations
   */
  async canAccessMultiLocation(teamId: string): Promise<boolean> {
    return await this.hasFeature(teamId, 'multi_location' as FeatureFlag);
  }

  /**
   * Check if team has API access
   */
  async canAccessAPI(teamId: string): Promise<boolean> {
    return await this.hasFeature(teamId, 'api_access' as FeatureFlag);
  }

  /**
   * Get all available features for a team
   */
  async getAllAvailableFeatures(teamId: string): Promise<FeatureFlag[]> {
    const teamFeatures = await this.getTeamFeatures(teamId);
    return ALL_FEATURES.filter(feature => teamFeatures.includes(feature));
  }

  /**
   * Invalidate cache for a team (call when subscription changes)
   */
  async invalidateCache(teamId: string): Promise<void> {
    this.cache.delete(teamId);
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Private helper methods
   */
  private async getTeamSubscription(teamId: string) {
    return await prisma.teamSubscription.findFirst({
      where: {
        teamId,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  private getCachedFeatures(teamId: string): string[] | null {
    const cached = this.cache.get(teamId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(teamId);
      return null;
    }

    return cached.features;
  }

  private setCachedFeatures(teamId: string, features: string[]): void {
    this.cache.set(teamId, {
      features,
      timestamp: Date.now()
    });
  }
}

/**
 * Singleton instance for global use
 */
export const featureAccessService = new FeatureAccessService();
