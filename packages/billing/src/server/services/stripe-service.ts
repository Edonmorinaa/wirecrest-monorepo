/**
 * Stripe Service using Official Stripe SDK
 * Server-side Stripe integration for subscription management
 */


import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';
import {
  SubscriptionPlan,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SubscriptionCalculation,
  SubscriptionTier,
} from '../../shared/types/index.js';
import { Decimal } from 'decimal.js';

export class StripeService {
  private _stripe: Stripe | null = null;

  constructor() {
    // Don't initialize Stripe instance in constructor
    // It will be created lazily when needed
  }

  get stripe(): Stripe {
    if (!this._stripe) {
      this._stripe = StripeService.getStripeInstance();
    }
    return this._stripe;
  }

  /**
   * Get a centralized Stripe instance
   * Use this instead of creating new Stripe instances
   */
  static getStripeInstance(): Stripe {
    // Check if we're on the server or client
    const isServer = typeof window === 'undefined';
    
    if (isServer) {
      // Server-side: use secret key
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required on server');
      }
      return new Stripe(process.env.STRIPE_SECRET_KEY, {
        typescript: true,
      });
    } else {
      // Client-side: use publishable key
      if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is required on client');
      }
      return new Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, {
        typescript: true,
      });
    }
  }

  // Note: Product initialization has been removed
  // All products and prices should be created manually in Stripe Dashboard
  // See stripe-products-config.json for the required configuration

  /**
   * Create or get Stripe customer
   */
  async createOrGetCustomer(teamId: string, email: string, name: string): Promise<Stripe.Customer> {
    // Check if customer already exists in our database
    const subscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
      select: { stripeCustomerId: true },
    });

    // Also check the team table for customer ID
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { stripeCustomerId: true },
    });

    const existingCustomerId = subscription?.stripeCustomerId || team?.stripeCustomerId;

    if (existingCustomerId) {
      try {
        const customer = await this.stripe.customers.retrieve(existingCustomerId);
        return customer as Stripe.Customer;
      } catch (error) {
        console.warn('Stripe customer not found, creating new one:', error);
      }
    }

    // Create new customer
    console.log('🔧 StripeService: Creating customer with email:', email, 'name:', name);
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: {
        teamId,
      },
    });
    console.log('✅ StripeService: Customer created successfully:', { 
      id: customer.id, 
      email: customer.email, 
      name: customer.name 
    });

    // Update our subscription record
    await prisma.teamSubscription.upsert({
      where: { teamId },
      create: {
        teamId,
        stripeCustomerId: customer.id,
        tier: 'FREE',
        status: 'ACTIVE',
        currentSeats: 1,
        currentLocations: 0,
      },
      update: {
        stripeCustomerId: customer.id,
      },
    });

    // Also update the team table with the customer ID
    await prisma.team.update({
      where: { id: teamId },
      data: { stripeCustomerId: customer.id },
    });

    return customer;
  }

  /**
   * Create subscription with Stripe
   */
  async createSubscription(input: CreateSubscriptionInput): Promise<{ subscriptionId: string; clientSecret?: string }> {
    // Get tier configuration from database
    const tierConfig = await prisma.subscriptionTierConfig.findFirst({
      where: { tier: input.tier, active: true }
    });
    
    // Get the Stripe product for this tier
    const stripeProduct = await prisma.stripeProduct.findFirst({
      where: { tier: input.tier, active: true }
    });
    
    if (!stripeProduct?.stripePriceId) {
      throw new Error(`No Stripe price configured for tier ${input.tier}`);
    }

    // Get team and owner information
    const team = await prisma.team.findUnique({
      where: { id: input.teamId },
      include: {
        members: {
          include: { user: true },
          where: { role: 'OWNER' },
          take: 1,
        },
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    const owner = team.members[0]?.user;
    if (!owner) {
      throw new Error('Team owner not found');
    }

    // Create or get customer
    const customer = await this.createOrGetCustomer(
      input.teamId,
      owner.email,
      owner.name || team.name
    );

    // Prepare subscription items
    const subscriptionItems: Stripe.SubscriptionCreateParams.Item[] = [
      {
        price: stripeProduct.stripePriceId!,
        quantity: 1, // Base plan
      },
    ];

    // Add additional seats if needed
    const additionalSeats = Math.max(0, (team.members.length || 1) - tierConfig.includedSeats);
    if (additionalSeats > 0) {
      const product = await this.stripe.products.retrieve(stripeProduct.stripeProductId);
      const seatPriceId = product.metadata.seatPriceId;
      
      if (seatPriceId) {
        subscriptionItems.push({
          price: seatPriceId,
          quantity: additionalSeats,
        });
      }
    }

    // Create subscription in Stripe
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: subscriptionItems,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        teamId: input.teamId,
        tier: input.tier,
      },
    };

    // Add trial if specified
    if (input.trialDays && input.trialDays > 0) {
      subscriptionParams.trial_period_days = input.trialDays;
    }

    const stripeSubscription = await this.stripe.subscriptions.create(subscriptionParams);

    // Update our subscription record
    const subscription = await prisma.teamSubscription.upsert({
      where: { teamId: input.teamId },
      create: {
        teamId: input.teamId,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: stripeSubscription.id,
        tier: input.tier,
        status: stripeSubscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE',
        basePrice: tierConfig.basePrice,
        includedSeats: tierConfig.includedSeats,
        includedLocations: tierConfig.includedLocations,
        includedRefreshes: tierConfig.includedRefreshes,
        pricePerSeat: tierConfig.pricePerSeat,
        pricePerLocation: tierConfig.pricePerLocation,
        pricePerRefresh: tierConfig.pricePerRefresh,
        currentSeats: team.members.length || 1,
        currentLocations: 0,
        enabledFeatures: tierConfig.enabledFeatures,
        currentPeriodStart: new Date(((stripeSubscription as any).current_period_start || 0) * 1000),
        currentPeriodEnd: new Date(((stripeSubscription as any).current_period_end || 0) * 1000),
        trialStart: stripeSubscription.trial_start ? new Date((stripeSubscription.trial_start || 0) * 1000) : null,
        trialEnd: stripeSubscription.trial_end ? new Date((stripeSubscription.trial_end || 0) * 1000) : null,
      },
      update: {
        stripeSubscriptionId: stripeSubscription.id,
        tier: input.tier,
        status: stripeSubscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE',
        basePrice: tierConfig.basePrice,
        includedSeats: tierConfig.includedSeats,
        includedLocations: tierConfig.includedLocations,
        includedRefreshes: tierConfig.includedRefreshes,
        pricePerSeat: tierConfig.pricePerSeat,
        pricePerLocation: tierConfig.pricePerLocation,
        pricePerRefresh: tierConfig.pricePerRefresh,
        enabledFeatures: tierConfig.enabledFeatures,
        currentPeriodStart: new Date(((stripeSubscription as any).current_period_start || 0) * 1000),
        currentPeriodEnd: new Date(((stripeSubscription as any).current_period_end || 0) * 1000),
        trialStart: stripeSubscription.trial_start ? new Date((stripeSubscription.trial_start || 0) * 1000) : null,
        trialEnd: stripeSubscription.trial_end ? new Date((stripeSubscription.trial_end || 0) * 1000) : null,
      },
    });

    // Extract client secret for payment confirmation
    let clientSecret: string | undefined;
    if (stripeSubscription.latest_invoice) {
      const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
      if ('payment_intent' in invoice && invoice.payment_intent && typeof invoice.payment_intent === 'object') {
        const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
        clientSecret = paymentIntent.client_secret || undefined;
      }
    }

    return { 
      subscriptionId: subscription.id,
      clientSecret 
    };
  }

  /**
   * Update subscription (change plan, seats, locations)
   */
  async updateSubscription(
    teamId: string,
    updates: UpdateSubscriptionInput
  ): Promise<void> {
    const subscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('Stripe subscription not found');
    }

    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    // If changing tier, update the subscription items
    if (updates.tier && updates.tier !== subscription.tier) {
      const newTierConfig = await prisma.subscriptionTierConfig.findFirst({
        where: { tier: updates.tier, active: true }
      });
      
      // Get the Stripe product for the new tier
      const newStripeProduct = await prisma.stripeProduct.findFirst({
        where: { tier: updates.tier, active: true }
      });
      
      if (!newStripeProduct?.stripePriceId) {
        throw new Error(`No Stripe price configured for tier ${updates.tier}`);
      }
      
      // Cancel current subscription and create new one
      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
        prorate: true,
      });

      // Create new subscription with new tier
      await this.createSubscription({
        teamId,
        tier: updates.tier,
      });
    } else {
      // Update quantities for existing subscription
      const subscriptionItems = stripeSubscription.items.data;
      const updateItems: Stripe.SubscriptionUpdateParams.Item[] = [];

      for (const item of subscriptionItems) {
        if (updates.seats && item.price.nickname?.includes('Additional Seat')) {
          const currentTierConfig = await prisma.subscriptionTierConfig.findFirst({
            where: { tier: subscription.tier, active: true }
          });
          const additionalSeats = Math.max(0, updates.seats - (currentTierConfig?.includedSeats || 1));
          
          updateItems.push({
            id: item.id,
            quantity: additionalSeats,
          });
        } else if (updates.locations && item.price.nickname?.includes('Additional Location')) {
          const currentTierConfig = await prisma.subscriptionTierConfig.findFirst({
            where: { tier: subscription.tier, active: true }
          });
          const additionalLocations = Math.max(0, updates.locations - (currentTierConfig?.includedLocations || 1));
          
          updateItems.push({
            id: item.id,
            quantity: additionalLocations,
          });
        }
      }

      if (updateItems.length > 0) {
        await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          items: updateItems,
          proration_behavior: 'create_prorations',
          billing_cycle_anchor: 'now' as any,
        });
      }
    }

    // Update our database record
    await prisma.teamSubscription.update({
      where: { teamId },
      data: {
        tier: updates.tier || subscription.tier,
        currentSeats: updates.seats || subscription.currentSeats,
        currentLocations: updates.locations || subscription.currentLocations,
        enabledFeatures: updates.enabledFeatures || subscription.enabledFeatures,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(teamId: string, immediately: boolean = false): Promise<void> {
    const subscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('Stripe subscription not found');
    }

    if (immediately) {
      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      
      await prisma.teamSubscription.update({
        where: { teamId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
        },
      });
    } else {
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await prisma.teamSubscription.update({
        where: { teamId },
        data: {
          cancelAtPeriodEnd: true,
        },
      });
    }
  }

  /**
   * Calculate subscription pricing
   */
  async calculateSubscription(
    teamId: string,
    tier: SubscriptionTier,
    overrides?: {
      seats?: number;
      locations?: number;
    }
  ): Promise<SubscriptionCalculation> {
    const tierConfig = await prisma.subscriptionTierConfig.findFirst({
      where: { tier, active: true }
    });
    
    if (!tierConfig) {
      throw new Error(`No configuration found for tier ${tier}`);
    }
    const subscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    const currentSeats = overrides?.seats ?? subscription?.currentSeats ?? 1;
    const currentLocations = overrides?.locations ?? subscription?.currentLocations ?? 0;

    // Calculate amounts
    const baseAmount = new Decimal(tierConfig.basePrice);
    
    const additionalSeats = Math.max(0, currentSeats - tierConfig.includedSeats);
    const seatAmount = new Decimal(tierConfig.pricePerSeat).mul(additionalSeats);
    
    const additionalLocations = Math.max(0, currentLocations - tierConfig.includedLocations);
    const locationAmount = new Decimal(tierConfig.pricePerLocation).mul(additionalLocations);
    
    const usageAmount = new Decimal(0); // Usage-based billing calculated separately
    
    const totalAmount = baseAmount.add(seatAmount).add(locationAmount).add(usageAmount);

    // Build breakdown
    const breakdown = [
      {
        description: `${tierConfig.name} Plan`,
        quantity: 1,
        unitPrice: baseAmount,
        amount: baseAmount,
      },
    ];

    if (additionalSeats > 0) {
      breakdown.push({
        description: `Additional Seats (${additionalSeats})`,
        quantity: additionalSeats,
        unitPrice: new Decimal(tierConfig.pricePerSeat),
        amount: seatAmount,
      });
    }

    if (additionalLocations > 0) {
      breakdown.push({
        description: `Additional Locations (${additionalLocations})`,
        quantity: additionalLocations,
        unitPrice: new Decimal(tierConfig.pricePerLocation),
        amount: locationAmount,
      });
    }

    return {
      baseAmount,
      seatAmount,
      locationAmount,
      usageAmount,
      totalAmount,
      breakdown,
      nextBillingDate: subscription?.currentPeriodEnd ?? new Date(),
    };
  }

  /**
   * Create setup intent for payment method setup
   */
  async createSetupIntent(teamId: string): Promise<{ clientSecret: string }> {
    const subscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error('Customer not found');
    }

    const setupIntent = await this.stripe.setupIntents.create({
      customer: subscription.stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    return { clientSecret: setupIntent.client_secret! };
  }

  /**
   * Handle Stripe webhooks
   */
  async handleWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<{ processed: boolean; type: string }> {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw new Error('Invalid signature');
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.created':
        await this.handleInvoiceCreated(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.updated':
        await this.handleInvoiceUpdated(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.voided':
        await this.handleInvoiceVoided(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return { processed: false, type: event.type };
    }

    return { processed: true, type: event.type };
  }

  /**
   * Private webhook handlers
   */
  private async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    const teamId = subscription.metadata.teamId;
    if (!teamId) return;

    await prisma.teamSubscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status.toUpperCase() as any,
        currentPeriodStart: new Date(((subscription as any).current_period_start || 0) * 1000),
        currentPeriodEnd: new Date(((subscription as any).current_period_end || 0) * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        canceledAt: subscription.canceled_at ? new Date((subscription.canceled_at || 0) * 1000) : null,
      },
    });
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const invoiceSubscription = (invoice as any).subscription;
    const subscriptionId = typeof invoiceSubscription === 'string' 
      ? invoiceSubscription 
      : invoiceSubscription?.id;
      
    if (!subscriptionId) return;

    console.log(`💰 [Payment] Payment succeeded for subscription: ${subscriptionId}`);

    // REDIS DISABLED - no cache to invalidate
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const teamId = subscription.metadata.teamId;
    
    if (teamId) {
      console.log(`✅ [Payment] Payment processed for team ${teamId} (Cache disabled - will fetch fresh from Stripe)`);
      // REDIS DISABLED - uncomment to re-enable
      // const { getGlobalCacheService } = await import('./redis-subscription-cache');
      // const cacheService = getGlobalCacheService();
      // await cacheService.invalidate(teamId);
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const invoiceSubscription = (invoice as any).subscription;
    const subscriptionId = typeof invoiceSubscription === 'string' 
      ? invoiceSubscription 
      : invoiceSubscription?.id;
      
    if (!subscriptionId) return;

    // Update subscription status
    await prisma.teamSubscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: 'PAST_DUE',
      },
    });

    // Update local invoice status if it exists
    await this.syncStripeInvoiceToLocal(invoice);
  }

  private async handleInvoiceCreated(invoice: Stripe.Invoice): Promise<void> {
    await this.syncStripeInvoiceToLocal(invoice);
  }

  private async handleInvoiceUpdated(invoice: Stripe.Invoice): Promise<void> {
    await this.syncStripeInvoiceToLocal(invoice);
  }

  private async handleInvoiceVoided(invoice: Stripe.Invoice): Promise<void> {
    await this.syncStripeInvoiceToLocal(invoice);
  }

  /**
   * Sync Stripe invoice to local database
   */
  private async syncStripeInvoiceToLocal(stripeInvoice: Stripe.Invoice): Promise<void> {
    try {
      // Find team subscription by customer ID
      const subscription = await prisma.teamSubscription.findUnique({
        where: { stripeCustomerId: stripeInvoice.customer as string },
      });

      if (!subscription) {
        console.warn(`No local subscription found for Stripe customer: ${stripeInvoice.customer}`);
        return;
      }

      // Map Stripe status to local status
      const statusMap: Record<string, string> = {
        'draft': 'DRAFT',
        'open': 'OPEN',
        'paid': 'PAID',
        'void': 'VOID',
        'uncollectible': 'UNCOLLECTIBLE',
      };

      const localStatus = statusMap[stripeInvoice.status] || 'DRAFT';

      // Create or update local invoice
      await prisma.invoice.upsert({
        where: { stripeInvoiceId: stripeInvoice.id },
        create: {
          stripeInvoiceId: stripeInvoice.id,
          subscriptionId: subscription.id,
          number: stripeInvoice.number,
          status: localStatus as any,
          amount: new Decimal(stripeInvoice.amount_due).div(100), // Convert from cents
          currency: stripeInvoice.currency,
          periodStart: new Date(stripeInvoice.period_start * 1000),
          periodEnd: new Date(stripeInvoice.period_end * 1000),
          dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null,
          paidAt: stripeInvoice.status_transitions?.paid_at ? new Date(stripeInvoice.status_transitions.paid_at * 1000) : null,
          metadata: {
            stripeData: {
              id: stripeInvoice.id,
              hosted_invoice_url: stripeInvoice.hosted_invoice_url,
              invoice_pdf: stripeInvoice.invoice_pdf,
            },
          },
        },
        update: {
          number: stripeInvoice.number,
          status: localStatus as any,
          amount: new Decimal(stripeInvoice.amount_due).div(100),
          dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null,
          paidAt: stripeInvoice.status_transitions?.paid_at ? new Date(stripeInvoice.status_transitions.paid_at * 1000) : null,
          metadata: {
            stripeData: {
              id: stripeInvoice.id,
              hosted_invoice_url: stripeInvoice.hosted_invoice_url,
              invoice_pdf: stripeInvoice.invoice_pdf,
            },
          },
        },
      });

      // Handle line items if they exist
      if (stripeInvoice.lines?.data) {
        const localInvoice = await prisma.invoice.findUnique({
          where: { stripeInvoiceId: stripeInvoice.id },
        });

        if (localInvoice) {
          // Delete existing line items and recreate
          await prisma.invoiceLineItem.deleteMany({
            where: { invoiceId: localInvoice.id },
          });

          for (const line of stripeInvoice.lines.data) {
            await prisma.invoiceLineItem.create({
              data: {
                invoiceId: localInvoice.id,
                description: line.description || 'Stripe Line Item',
                quantity: line.quantity || 1,
                unitPrice: new Decimal(line.amount).div(100),
                amount: new Decimal(line.amount).div(100),
                metadata: {
                  stripeLineItemId: line.id,
                },
              },
            });
          }
        }
      }

    } catch (error) {
      console.error('Failed to sync Stripe invoice to local DB:', error);
    }
  }

  /**
   * Get current active subscription for a Stripe customer ID
   */
  async getCurrentSubscription(stripeCustomerId: string): Promise<{
    subscription: Stripe.Subscription | null;
    productId: string | null;
    status: string | null;
  }> {
    try {
      console.log(`🔍 Getting current subscription for customer: ${stripeCustomerId}`);

      // Get all subscriptions for the customer
      const subscriptions = await this.stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 10,
      });

      // Find the most recent active subscription
      const activeSubscription = subscriptions.data.find(sub => 
        sub.status === 'active' || sub.status === 'trialing'
      );

      if (!activeSubscription) {
        console.log('❌ No active subscription found for customer');
        return {
          subscription: null,
          productId: null,
          status: null,
        };
      }

      // Get the product ID from the subscription
      const productId = activeSubscription.items.data[0]?.price?.product as string;
      
      console.log(`✅ Found active subscription: ${activeSubscription.id}`);
      console.log(`📦 Product ID: ${productId}`);
      console.log(`📊 Status: ${activeSubscription.status}`);

      return {
        subscription: activeSubscription,
        productId,
        status: activeSubscription.status,
      };
    } catch (error) {
      console.error('❌ Error getting current subscription:', error);
      return {
        subscription: null,
        productId: null,
        status: null,
      };
    }
  }
}