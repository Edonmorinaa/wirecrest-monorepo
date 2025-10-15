/**
 * Enhanced Subscription Management Service
 * Orchestrates subscription lifecycle management with Stripe integration
 */

import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';
import { BillingService } from './billing-service';
import { PaymentMethodService } from './payment-method-service';
import { ProductService } from './product-service';
import { SubscriptionFeaturesService } from './subscription-features-service';
import { StripeService } from './stripe-service';
import { invalidateTeamCacheImmediately } from './cache-invalidation-service';
import type { SubscriptionTier } from './types';

export interface SubscriptionCreationOptions {
  teamId: string;
  priceId: string;
  paymentMethodId?: string;
  trialDays?: number;
  quantity?: number;
  couponId?: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionUpdateOptions {
  newPriceId?: string;
  quantity?: number;
  couponId?: string;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  metadata?: Record<string, string>;
}

export interface SubscriptionUpgradeResult {
  subscription: Stripe.Subscription;
  invoice?: Stripe.Invoice;
  paymentIntent?: Stripe.PaymentIntent;
  requiresPaymentConfirmation: boolean;
}

export interface TeamSubscriptionInfo {
  subscription: Stripe.Subscription | null;
  localSubscription: any; // From Prisma
  currentTier: SubscriptionTier | null;
  enabledFeatures: string[];
  usage: {
    seats: number;
    locations: number;
    refreshes: number;
  };
  limits: {
    maxSeats: number;
    maxLocations: number;
    maxRefreshes: number;
  };
  billing: {
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: Date | null;
  };
}

export class SubscriptionManagementService {
  private stripe: Stripe;
  private billingService: BillingService;
  private paymentMethodService: PaymentMethodService;
  private productService: ProductService;
  private featuresService: SubscriptionFeaturesService;
  private stripeService: StripeService;

  constructor() {
    // Ensure this service only runs on the server
    if (typeof window !== 'undefined') {
      throw new Error('SubscriptionManagementService can only be instantiated on the server');
    }

    // Use the centralized StripeService to get the appropriate instance
    this.stripe = StripeService.getStripeInstance();

    this.billingService = new BillingService();
    this.paymentMethodService = new PaymentMethodService();
    this.productService = new ProductService();
    this.featuresService = new SubscriptionFeaturesService();
    this.stripeService = new StripeService();
  }

  /**
   * Create a new subscription with comprehensive setup
   */
  async createSubscription(options: SubscriptionCreationOptions): Promise<{
    subscription: Stripe.Subscription;
    setupIntent?: Stripe.SetupIntent;
    clientSecret?: string;
    requiresPaymentConfirmation: boolean;
  }> {
    const { teamId, priceId, paymentMethodId, trialDays, quantity = 1, couponId, metadata } = options;

    // Validate team exists and user has permission
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        subscription: true,
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Check for existing subscription
    if (team.subscription) {
      const existingStatus = team.subscription.status;
      
      // If subscription is active, trialing, or past_due, don't allow new subscription
      if (['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(existingStatus)) {
        throw new Error(`Team already has an active subscription (ID: ${team.subscription.stripeSubscriptionId}, Status: ${existingStatus})`);
      }
      
      // If subscription is incomplete or unpaid, cancel it in Stripe and clean up
      if (['INCOMPLETE', 'INCOMPLETE_EXPIRED', 'UNPAID'].includes(existingStatus) && team.subscription.stripeSubscriptionId) {
        console.log(`🧹 Cleaning up incomplete subscription: ${team.subscription.stripeSubscriptionId}`);
        try {
          await this.stripe.subscriptions.cancel(team.subscription.stripeSubscriptionId);
          console.log(`✅ Canceled incomplete subscription in Stripe`);
        } catch (error) {
          console.warn(`⚠️ Failed to cancel incomplete subscription in Stripe:`, error);
        }
        
        // Delete the local subscription record
        await prisma.teamSubscription.delete({
          where: { teamId },
        });
        console.log(`✅ Deleted local subscription record`);
      }
    }

    // Get team owner information for customer creation
    const teamWithOwner = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: true },
          where: { role: 'OWNER' },
          take: 1,
        },
      },
    });

    if (!teamWithOwner?.members[0]?.user) {
      throw new Error('Team owner not found');
    }

    const owner = teamWithOwner.members[0].user;

    // Get or create Stripe customer
    let customer;
    try {
      customer = await this.stripeService.createOrGetCustomer(teamId, owner.email, owner.name || teamWithOwner.name);
    } catch (error) {
      throw new Error(`Failed to create or get Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate required parameters
    if (!priceId) {
      throw new Error('priceId is required to create a subscription');
    }

    console.log('🔧 Creating subscription with:', {
      teamId,
      priceId,
      quantity,
      customerId: customer.id,
    });

    // Validate that the price exists in Stripe
    try {
      const price = await this.stripe.prices.retrieve(priceId);
      console.log('✅ Price validated:', {
        id: price.id,
        active: price.active,
        unit_amount: price.unit_amount,
        currency: price.currency,
      });
    } catch (error) {
      throw new Error(`Invalid priceId: ${priceId}. Price not found in Stripe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Prepare subscription parameters
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [{ price: priceId, quantity }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
      metadata: {
        teamId,
        ...metadata,
      },
    };

    // Add trial period if specified
    if (trialDays && trialDays > 0) {
      subscriptionParams.trial_period_days = trialDays;
    }

    // Add coupon if specified
    if (couponId) {
      subscriptionParams.coupon = couponId;
    }

    // Add payment method if provided
    if (paymentMethodId) {
      subscriptionParams.default_payment_method = paymentMethodId;
    }

    // Create subscription
    let subscription;
    try {
      console.log('🔧 Stripe subscription params:', JSON.stringify(subscriptionParams, null, 2));
      subscription = await this.stripe.subscriptions.create(subscriptionParams);
      console.log('✅ Stripe subscription created:', subscription.id);
    } catch (error) {
      console.error('❌ Stripe subscription creation failed:', error);
      throw new Error(`Failed to create Stripe subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Sync to local database
    await this.billingService.syncSubscriptionToLocal(subscription);

    // Determine if payment confirmation is required
    let clientSecret: string | undefined;
    let requiresPaymentConfirmation = false;
    let setupIntent: Stripe.SetupIntent | undefined;

    if (subscription.latest_invoice) {
      const invoice = subscription.latest_invoice as Stripe.Invoice;
      if ('payment_intent' in invoice && invoice.payment_intent) {
        const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
        clientSecret = paymentIntent.client_secret || undefined;
        requiresPaymentConfirmation = paymentIntent.status === 'requires_payment_method' || 
                                     paymentIntent.status === 'requires_confirmation';
      }
    }

    if (subscription.pending_setup_intent) {
      setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent;
      clientSecret = setupIntent.client_secret || undefined;
      requiresPaymentConfirmation = true;
    }

    // Immediately invalidate feature cache for this team
    await invalidateTeamCacheImmediately(options.teamId, 'subscription_change', {
      subscriptionId: subscription.id,
      priceId: options.priceId,
      quantity: options.quantity,
      trialDays: options.trialDays,
    });

    return {
      subscription,
      setupIntent,
      clientSecret,
      requiresPaymentConfirmation,
    };
  }

  /**
   * Upgrade or downgrade subscription with proper proration
   */
  async upgradeSubscription(
    teamId: string,
    newPriceId: string,
    options: Omit<SubscriptionUpdateOptions, 'newPriceId'> = {}
  ): Promise<SubscriptionUpgradeResult> {
    const { quantity, couponId, prorationBehavior = 'create_prorations', metadata } = options;

    // Get current subscription
    const localSubscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!localSubscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      localSubscription.stripeSubscriptionId,
      { expand: ['items.data.price'] }
    );

    if (subscription.status === 'canceled') {
      throw new Error('Cannot upgrade canceled subscription');
    }

    // Prepare update parameters
    const updateParams: Stripe.SubscriptionUpdateParams = {
      proration_behavior: prorationBehavior,
      billing_cycle_anchor: 'now' as any,
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        ...subscription.metadata,
        ...metadata,
      },
    };

    // Update subscription items
    const items: Stripe.SubscriptionUpdateParams.Item[] = [];
    for (const item of subscription.items.data) {
      items.push({
        id: item.id,
        price: newPriceId,
        quantity: quantity || item.quantity,
      });
    }
    updateParams.items = items;

    // Add coupon if specified
    if (couponId) {
      updateParams.coupon = couponId;
    }

    // Update subscription
    const updatedSubscription = await this.stripe.subscriptions.update(
      subscription.id,
      updateParams
    );

    // Sync to local database
    await this.billingService.syncSubscriptionToLocal(updatedSubscription);

    // Immediately invalidate feature cache for this team
    await invalidateTeamCacheImmediately(teamId, 'package_change', {
      subscriptionId: updatedSubscription.id,
      newPriceId,
      oldPriceId: subscription.items.data[0]?.price.id,
      quantity: quantity || subscription.items.data[0]?.quantity,
    });

    // Check if payment confirmation is required
    let invoice: Stripe.Invoice | undefined;
    let paymentIntent: Stripe.PaymentIntent | undefined;
    let requiresPaymentConfirmation = false;

    if (updatedSubscription.latest_invoice) {
      invoice = updatedSubscription.latest_invoice as Stripe.Invoice;
      if ('payment_intent' in invoice && invoice.payment_intent) {
        paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
        requiresPaymentConfirmation = paymentIntent.status === 'requires_payment_method' || 
                                     paymentIntent.status === 'requires_confirmation';
      }
    }

    return {
      subscription: updatedSubscription,
      invoice,
      paymentIntent,
      requiresPaymentConfirmation,
    };
  }

  /**
   * Cancel subscription with options for immediate or end of period
   */
  async cancelSubscription(
    teamId: string,
    options: {
      immediately?: boolean;
      reason?: string;
      feedback?: string;
    } = {}
  ): Promise<Stripe.Subscription> {
    const { immediately = false, reason, feedback } = options;

    const localSubscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!localSubscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    let subscription: Stripe.Subscription;

    if (immediately) {
      // Cancel immediately
      subscription = await this.stripe.subscriptions.cancel(
        localSubscription.stripeSubscriptionId
      );
      
      // Update metadata separately if needed
      if (reason || feedback) {
        await this.stripe.subscriptions.update(subscription.id, {
          metadata: {
            cancellation_reason: reason || 'user_requested',
            cancellation_feedback: feedback || '',
          },
        });
      }
    } else {
      // Cancel at period end
      subscription = await this.stripe.subscriptions.update(
        localSubscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
          metadata: {
            cancellation_reason: reason || 'user_requested',
            cancellation_feedback: feedback || '',
          },
        }
      );
    }

    // Sync to local database
    await this.billingService.syncSubscriptionToLocal(subscription);

    // Immediately invalidate feature cache for this team
    await invalidateTeamCacheImmediately(teamId, 'subscription_change', {
      subscriptionId: subscription.id,
      cancelled: true,
      immediately,
      reason,
      feedback,
    });

    return subscription;
  }

  /**
   * Reactivate a canceled subscription (if still within grace period)
   */
  async reactivateSubscription(teamId: string): Promise<Stripe.Subscription> {
    const localSubscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!localSubscription?.stripeSubscriptionId) {
      throw new Error('No subscription found');
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      localSubscription.stripeSubscriptionId
    );

    if (subscription.status === 'canceled') {
      throw new Error('Cannot reactivate permanently canceled subscription');
    }

    if (!subscription.cancel_at_period_end) {
      throw new Error('Subscription is not scheduled for cancellation');
    }

    // Remove cancellation
    const updatedSubscription = await this.stripe.subscriptions.update(
      subscription.id,
      { cancel_at_period_end: false, billing_cycle_anchor: 'now' as any }
    );

    // Sync to local database
    await this.billingService.syncSubscriptionToLocal(updatedSubscription);

    // Immediately invalidate feature cache for this team
    await invalidateTeamCacheImmediately(teamId, 'subscription_change', {
      subscriptionId: updatedSubscription.id,
      reactivated: true,
    });

    return updatedSubscription;
  }

  /**
   * Update subscription quantity (for seat-based billing)
   */
  async updateSubscriptionQuantity(
    teamId: string,
    newQuantity: number,
    prorationBehavior: 'create_prorations' | 'none' = 'create_prorations'
  ): Promise<Stripe.Subscription> {
    const localSubscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!localSubscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      localSubscription.stripeSubscriptionId
    );

    // Update quantity for all subscription items
    const items: Stripe.SubscriptionUpdateParams.Item[] = [];
    for (const item of subscription.items.data) {
      items.push({
        id: item.id,
        quantity: newQuantity,
      });
    }

    const updatedSubscription = await this.stripe.subscriptions.update(
      subscription.id,
      {
        items,
        proration_behavior: prorationBehavior,
      }
    );

    // Sync to local database
    await this.billingService.syncSubscriptionToLocal(updatedSubscription);

    return updatedSubscription;
  }

  /**
   * Get comprehensive subscription information for a team
   */
  async getTeamSubscriptionInfo(teamId: string): Promise<TeamSubscriptionInfo> {
    // Get local subscription data
    const localSubscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
      include: {
        team: {
          include: {
            members: true,
          },
        },
      },
    });

    // Get Stripe subscription if exists
    let stripeSubscription: Stripe.Subscription | null = null;
    if (localSubscription?.stripeSubscriptionId) {
      try {
        stripeSubscription = await this.stripe.subscriptions.retrieve(
          localSubscription.stripeSubscriptionId,
          { expand: ['items.data.price.product'] }
        );
      } catch (error) {
        console.warn('Failed to retrieve Stripe subscription:', error);
      }
    }

    // Get enabled features
    const enabledFeatures = await this.featuresService.getEnabledFeatures(teamId);

    // Calculate current usage
    const currentSeats = localSubscription?.team?.members?.length || 0;
    const currentLocations = localSubscription?.currentLocations || 0;
    const currentRefreshes = 0; // TODO: Implement usage tracking

    // Get tier limits from product metadata
    let maxSeats = 1;
    let maxLocations = 1;
    let maxRefreshes = 24;

    if (stripeSubscription?.items.data[0]?.price.product) {
      const product = stripeSubscription.items.data[0].price.product as Stripe.Product;
      maxSeats = parseInt(product.metadata.includedSeats || '1');
      maxLocations = parseInt(product.metadata.includedLocations || '1');
      maxRefreshes = parseInt(product.metadata.includedRefreshes || '24');
    }

    return {
      subscription: stripeSubscription,
      localSubscription,
      currentTier: localSubscription?.tier || null,
      enabledFeatures,
      usage: {
        seats: currentSeats,
        locations: currentLocations,
        refreshes: currentRefreshes,
      },
      limits: {
        maxSeats,
        maxLocations,
        maxRefreshes,
      },
      billing: {
        currentPeriodStart: stripeSubscription ? new Date((stripeSubscription as any).current_period_start * 1000) : null,
        currentPeriodEnd: stripeSubscription ? new Date((stripeSubscription as any).current_period_end * 1000) : null,
        cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end || false,
        trialEnd: stripeSubscription?.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      },
    };
  }

  /**
   * Preview subscription changes (pricing, proration, etc.)
   */
  async previewSubscriptionChange(
    teamId: string,
    newPriceId: string,
    options: {
      quantity?: number;
      couponId?: string;
      prorationDate?: number;
    } = {}
  ): Promise<{
    invoice: Stripe.UpcomingInvoice;
    immediateTotal: number;
    nextInvoiceTotal: number;
    prorationAmount: number;
  }> {
    // Ensure this operation only runs on the server
    if (typeof window !== 'undefined') {
      throw new Error('previewSubscriptionChange can only be called on the server');
    }

    try {
      const { quantity, couponId, prorationDate } = options;

      const localSubscription = await prisma.teamSubscription.findUnique({
        where: { teamId },
      });

      if (!localSubscription?.stripeSubscriptionId) {
        throw new Error('No active subscription found for this team');
      }

      const subscription = await this.stripe.subscriptions.retrieve(
        localSubscription.stripeSubscriptionId
      );

      if (!subscription.items.data.length) {
        throw new Error('No subscription items found');
      }

      // Create upcoming invoice preview using Stripe's preview API
      const upcomingInvoiceParams: any = {
        customer: subscription.customer as string,
        subscription: subscription.id,
        subscription_details: {
          items: [
            {
              id: subscription.items.data[0].id,
              price: newPriceId,
              quantity: quantity || subscription.items.data[0].quantity,
            },
          ],
          proration_date: prorationDate || Math.floor(Date.now() / 1000),
        },
      };

      if (couponId) {
        upcomingInvoiceParams.discounts = [{ coupon: couponId }];
      }

      const previewInvoice = await this.stripe.invoices.createPreview(upcomingInvoiceParams);

      // Calculate totals
      const immediateTotal = previewInvoice.amount_due / 100;
      const nextInvoiceTotal = previewInvoice.amount_due / 100; // Simplified
      
      // Calculate proration amount (difference between old and new pricing)
      const prorationAmount = previewInvoice.lines.data.reduce((total, line) => {
        // Check if this line item represents a proration
        const isProration = 
          line.parent?.invoice_item_details?.proration === true ||
          line.parent?.subscription_item_details?.proration === true;
        
        if (isProration) {
          return total + (line.amount / 100);
        }
        return total;
      }, 0);

      return {
        invoice: previewInvoice,
        immediateTotal,
        nextInvoiceTotal,
        prorationAmount
      };
    } catch (error) {
      console.error('Error in previewSubscriptionChange:', error);
      if (error instanceof Error) {
        throw new Error(`Subscription preview failed: ${error.message}`);
      }
      throw new Error('Subscription preview failed: Unknown error');
    }
  }

  /**
   * Handle subscription lifecycle events
   */
  async handleSubscriptionEvent(
    eventType: string,
    subscription: Stripe.Subscription
  ): Promise<void> {
    const teamId = subscription.metadata.teamId;
    if (!teamId) {
      console.warn('Subscription event missing teamId metadata');
      return;
    }

    switch (eventType) {
      case 'customer.subscription.created':
        await this.onSubscriptionCreated(teamId, subscription);
        break;
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(teamId, subscription);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(teamId, subscription);
        break;
      case 'customer.subscription.trial_will_end':
        await this.onTrialWillEnd(teamId, subscription);
        break;
    }
  }

  /**
   * Private event handlers
   */
  private async onSubscriptionCreated(teamId: string, subscription: Stripe.Subscription): Promise<void> {
    console.log(`🎉 Subscription created for team ${teamId}`);
    
    // Sync to local database (already handled by webhook)
    await this.billingService.syncSubscriptionToLocal(subscription);
    
    // TODO: Send welcome email
    // TODO: Enable features based on subscription
    // TODO: Analytics tracking
  }

  private async onSubscriptionUpdated(teamId: string, subscription: Stripe.Subscription): Promise<void> {
    console.log(`🔄 Subscription updated for team ${teamId}`);
    
    // Sync to local database
    await this.billingService.syncSubscriptionToLocal(subscription);
    
    // TODO: Handle tier changes
    // TODO: Update feature access
    // TODO: Send notification if significant change
  }

  private async onSubscriptionDeleted(teamId: string, subscription: Stripe.Subscription): Promise<void> {
    console.log(`❌ Subscription canceled for team ${teamId}`);
    
    // Sync to local database
    await this.billingService.syncSubscriptionToLocal(subscription);
    
    // TODO: Disable premium features
    // TODO: Send cancellation confirmation
    // TODO: Schedule data retention cleanup
  }

  private async onTrialWillEnd(teamId: string, subscription: Stripe.Subscription): Promise<void> {
    console.log(`⏰ Trial ending soon for team ${teamId}`);
    
    // TODO: Send trial ending notification
    // TODO: Prompt for payment method if none on file
    // TODO: Offer discount or extension
  }
}
