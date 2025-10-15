/**
 * Subscription Features Service
 * Determines user's enabled features based on their Stripe subscription
 */

import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';
import { ProductService } from './product-service';
import { StripeService } from './stripe-service';

export class SubscriptionFeaturesService {
  private stripe: Stripe;
  private productService: ProductService;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = StripeService.getStripeInstance();

    this.productService = new ProductService();
  }

  /**
   * Get enabled feature flags for a team based on their subscription
   */
  async getEnabledFeatures(teamId: string): Promise<string[]> {
    try {
      // Get team's subscription
      const subscription = await prisma.teamSubscription.findUnique({
        where: { teamId },
      });

      // If no subscription or no Stripe subscription, return FREE tier features
      if (!subscription?.stripeSubscriptionId) {
        return await this.getFreeTierFeatures();
      }

      // Get Stripe subscription
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId,
        { expand: ['items.data.price.product'] }
      );

      // Extract features from all subscription items (in case of multiple products)
      const allFeatures = new Set<string>();

      for (const item of stripeSubscription.items.data) {
        const product = item.price.product as Stripe.Product;
        if (product.metadata?.featureFlags) {
          try {
            const features = JSON.parse(product.metadata.featureFlags) as string[];
            features.forEach(feature => allFeatures.add(feature));
          } catch (error) {
            console.warn('Failed to parse featureFlags from Stripe product:', error);
          }
        }
      }

      return Array.from(allFeatures);
    } catch (error) {
      console.error('Failed to get enabled features for team:', error);
      // Fallback to FREE tier features on error
      return await this.getFreeTierFeatures();
    }
  }

  /**
   * Check if a team has access to a specific feature
   */
  async hasFeature(teamId: string, featureName: string): Promise<boolean> {
    const enabledFeatures = await this.getEnabledFeatures(teamId);
    return enabledFeatures.includes(featureName);
  }

  /**
   * Get multiple feature access status for a team
   */
  async hasFeatures(teamId: string, featureNames: string[]): Promise<Record<string, boolean>> {
    const enabledFeatures = await this.getEnabledFeatures(teamId);
    const enabledSet = new Set(enabledFeatures);
    
    return featureNames.reduce((acc, featureName) => {
      acc[featureName] = enabledSet.has(featureName);
      return acc;
    }, {} as Record<string, boolean>);
  }

  /**
   * Get subscription tier information with features
   */
  async getSubscriptionInfo(teamId: string): Promise<{
    tier: string;
    status: string;
    enabledFeatures: string[];
    subscription?: Stripe.Subscription;
    product?: {
      name: string;
      description?: string;
      metadata: Record<string, any>;
    };
  }> {
    try {
      // Get team's subscription
      const subscription = await prisma.teamSubscription.findUnique({
        where: { teamId },
      });

      if (!subscription?.stripeSubscriptionId) {
        return {
          tier: 'FREE',
          status: 'ACTIVE',
          enabledFeatures: await this.getFreeTierFeatures(),
        };
      }

      // Get Stripe subscription
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId,
        { expand: ['items.data.price.product'] }
      );

      // Get primary product (first item)
      const primaryItem = stripeSubscription.items.data[0];
      const product = primaryItem?.price.product as Stripe.Product;

      const enabledFeatures = await this.getEnabledFeatures(teamId);

      return {
        tier: product?.metadata?.tier || 'UNKNOWN',
        status: stripeSubscription.status.toUpperCase(),
        enabledFeatures,
        subscription: stripeSubscription,
        product: product ? {
          name: product.name,
          description: product.description || undefined,
          metadata: product.metadata,
        } : undefined,
      };
    } catch (error) {
      console.error('Failed to get subscription info for team:', error);
      return {
        tier: 'FREE',
        status: 'ACTIVE',
        enabledFeatures: await this.getFreeTierFeatures(),
      };
    }
  }

  /**
   * Get features for FREE tier (fallback)
   */
  private async getFreeTierFeatures(): Promise<string[]> {
    try {
      // Try to get FREE tier from database config
      const freeConfig = await prisma.subscriptionTierConfig.findUnique({
        where: { tier: 'FREE' },
      });

      return freeConfig?.enabledFeatures || [
        'google_reviews_access',
        'facebook_reviews_access',
      ];
    } catch (error) {
      console.warn('Failed to get FREE tier features from database:', error);
      // Hardcoded fallback
      return [
        'google_reviews_access',
        'facebook_reviews_access',
      ];
    }
  }

  /**
   * Refresh subscription data from Stripe (useful after subscription changes)
   */
  async refreshSubscriptionData(teamId: string): Promise<void> {
    try {
      const subscription = await prisma.teamSubscription.findUnique({
        where: { teamId },
      });

      if (!subscription?.stripeSubscriptionId) {
        return;
      }

      // Get fresh data from Stripe
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      // Update local subscription record
      await prisma.teamSubscription.update({
        where: { teamId },
        data: {
          status: stripeSubscription.status.toUpperCase() as any,
          currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
          trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
          trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
        },
      });

      console.log(`✅ Refreshed subscription data for team ${teamId}`);
    } catch (error) {
      console.error('Failed to refresh subscription data:', error);
      throw error;
    }
  }
}
