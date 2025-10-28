/**
 * Simple Product Webhook Handler
 * 
 * Handles webhook events for product feature changes.
 * Simple and focused.
 */

import Stripe from 'stripe';
import { FeatureChecker, getGlobalFeatureChecker } from '../feature-system/feature-checker.js';

export interface ProductWebhookConfig {
  stripeSecretKey: string;
  featureChecker?: FeatureChecker;
}

export class ProductWebhookHandler {
  private featureChecker?: FeatureChecker;


  constructor(config: ProductWebhookConfig) {
    // Use the provided featureChecker or fall back to the global instance
    this.featureChecker = config.featureChecker || getGlobalFeatureChecker();
    console.log(`🔧 ProductWebhookHandler created with FeatureChecker instance ID: ${this.featureChecker?.instanceId || 'none'}`);
  }

  /**
   * Handle webhook events related to product features and billing
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    console.log(`🔔 Received webhook event: ${event.type}`);

    switch (event.type) {
      case 'product.updated':
        await this.handleProductUpdated(event.data.object as Stripe.Product);
        break;
      
      case 'product.deleted':
        await this.handleProductDeleted(event.data.object as Stripe.Product);
        break;
      
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.paused':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        await this.handlePaymentChange(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`ℹ️ Event ${event.type} not handled`);
        break;
    }
  }

  /**
   * Handle when a product is updated
   */
  private async handleProductUpdated(product: Stripe.Product): Promise<void> {
    console.log(`📦 Product updated: ${product.id}`);
    
    // Clear all feature caches since product features may have changed
    if (this.featureChecker) {
      await this.featureChecker.clearAllCache();
      console.log(`🗑️ Cleared all feature caches due to product update: ${product.id}`);
    }
  }

  /**
   * Handle when a product is deleted
   */
  private async handleProductDeleted(product: Stripe.Product): Promise<void> {
    console.log(`🗑️ Product deleted: ${product.id}`);
    
    // Clear all feature caches since the product no longer exists
    if (this.featureChecker) {
      await this.featureChecker.clearAllCache();
      console.log(`🗑️ Cleared all feature caches due to product deletion: ${product.id}`);
    }
  }

  /**
   * Handle when checkout session is completed
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log(`🛒 Checkout session completed: ${session.id}`);
    
    // Clear all feature caches since checkout completion creates/updates subscription
    if (this.featureChecker) {
      console.log(`🗑️ Clearing all feature caches due to checkout completion: ${session.id}`);
      await this.featureChecker.clearAllCache();
      console.log(`🗑️ Cleared all feature caches due to checkout completion: ${session.id}`);
    } else {
      console.log(`❌ No featureChecker available to clear cache for checkout session: ${session.id}`);
    }
  }

  /**
   * Handle subscription changes (created, updated, deleted)
   */
  private async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    console.log(`💳 Subscription changed: ${subscription.id} (status: ${subscription.status})`);
    
    // Clear all feature caches since subscription changes affect feature access
    if (this.featureChecker) {
      console.log(`🗑️ About to clear all feature caches for subscription: ${subscription.id}`);
      await this.featureChecker.clearAllCache();
      console.log(`🗑️ Cleared all feature caches due to subscription change: ${subscription.id}`);
    } else {
      console.log(`❌ No featureChecker available to clear cache for subscription: ${subscription.id}`);
    }
  }

  /**
   * Clear cache for a specific team (useful for targeted cache invalidation)
   */
  async clearTeamCache(teamId: string): Promise<void> {
    if (this.featureChecker) {
      await this.featureChecker.clearTeamCache(teamId);
      console.log(`🗑️ Cleared cache for team ${teamId}`);
    }
  }

  /**
   * Handle payment changes (succeeded, failed)
   */
  private async handlePaymentChange(invoice: Stripe.Invoice): Promise<void> {
    console.log(`💳 Payment changed: ${invoice.id} (status: ${invoice.status})`);
    
    // Clear all feature caches since payment changes can affect subscription status
    if (this.featureChecker) {
      this.featureChecker.clearAllCache();
      console.log(`🗑️ Cleared all feature caches due to payment change: ${invoice.id}`);
    }
  }

  /**
   * Get supported webhook event types
   */
  getSupportedEventTypes(): string[] {
    return [
      'product.updated',
      'product.deleted',
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
    ];
  }
}

/**
 * Factory function
 */
export function createProductWebhookHandler(config: ProductWebhookConfig): ProductWebhookHandler {
  return new ProductWebhookHandler(config);
}
