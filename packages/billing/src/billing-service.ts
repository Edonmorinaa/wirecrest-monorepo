/**
 * Billing Service
 * Stripe-driven billing service using only Stripe types and functionality
 */

import Stripe from 'stripe';
import { prisma } from '@wirecrest/db';
import { StripeService } from './stripe-service';
import { invalidateTeamCacheImmediately } from './cache-invalidation-service';

export class BillingService {
  private stripe: Stripe;

  constructor() {
    this.stripe = StripeService.getStripeInstance();
  }

  /**
   * Create or retrieve Stripe customer for a team
   */
  async createOrGetCustomer(teamId: string): Promise<Stripe.Customer> {
    // Get team information
    const team = await prisma.team.findUnique({
      where: { id: teamId },
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

    // Check if customer already exists
    if (team.stripeCustomerId) {
      try {
        const customer = await this.stripe.customers.retrieve(team.stripeCustomerId);
        return customer as Stripe.Customer;
      } catch (error) {
        console.warn('Stripe customer not found, creating new one:', error);
      }
    }

    // Create new customer
    const owner = team.members[0]?.user;
    const customerParams: Stripe.CustomerCreateParams = {
      email: owner?.email || `team-${teamId}@example.com`,
      name: owner?.name || team.name,
      metadata: {
        teamId,
      },
    };

    const customer = await this.stripe.customers.create(customerParams);

    // Update team with customer ID
    await prisma.team.update({
      where: { id: teamId },
      data: { stripeCustomerId: customer.id },
    });

    return customer;
  }

  /**
   * Create subscription using Stripe
   */
  async createSubscription(
    teamId: string,
    priceId: string,
    paymentMethodId?: string
  ): Promise<{ subscription: Stripe.Subscription; clientSecret?: string }> {
    const customer = await this.createOrGetCustomer(teamId);

    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        teamId,
      },
    };

    if (paymentMethodId) {
      subscriptionParams.default_payment_method = paymentMethodId;
    }

    const subscription = await this.stripe.subscriptions.create(subscriptionParams);

    // NOTE: No longer syncing to database - Stripe is source of truth
    // Webhooks will invalidate cache when subscription is created

    // Extract client secret for payment confirmation
    let clientSecret: string | undefined;
    if (subscription.latest_invoice) {
      const invoice = subscription.latest_invoice as Stripe.Invoice;
      if ('payment_intent' in invoice && invoice.payment_intent && typeof invoice.payment_intent === 'object') {
        const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
        clientSecret = paymentIntent.client_secret || undefined;
      } else if ('payment_intent' in invoice && invoice.payment_intent && typeof invoice.payment_intent === 'string') {
        // If payment_intent is just an ID, we'd need to fetch it separately
        // For now, skip client_secret extraction
        console.log('Payment intent is ID only, not expanded');
      }
    }

    return { subscription, clientSecret };
  }

  /**
   * Update subscription using Stripe
   */
  async updateSubscription(
    teamId: string,
    newPriceId?: string,
    quantity?: number
  ): Promise<Stripe.Subscription> {
    const localSubscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!localSubscription?.stripeSubscriptionId) {
      throw new Error('Subscription not found');
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      localSubscription.stripeSubscriptionId
    );

    const updateParams: Stripe.SubscriptionUpdateParams = {
      proration_behavior: 'create_prorations',
      billing_cycle_anchor: 'now' as any,
    };

    // Update price or quantity
    if (newPriceId || quantity) {
      const items: Stripe.SubscriptionUpdateParams.Item[] = [];
      
      for (const item of subscription.items.data) {
        items.push({
          id: item.id,
          price: newPriceId || item.price.id,
          quantity: quantity || item.quantity,
        });
      }
      
      updateParams.items = items;
    }

    const updatedSubscription = await this.stripe.subscriptions.update(
      subscription.id,
      updateParams
    );

    // NOTE: No longer syncing to database - Stripe is source of truth
    // Invalidate cache immediately for this team
    await invalidateTeamCacheImmediately(teamId, 'package_change', {
      subscriptionId: updatedSubscription.id,
      newPriceId,
      quantity,
    });

    return updatedSubscription;
  }

  /**
   * Cancel subscription using Stripe
   */
  async cancelSubscription(
    teamId: string,
    immediately: boolean = false
  ): Promise<Stripe.Subscription> {
    const localSubscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!localSubscription?.stripeSubscriptionId) {
      throw new Error('Subscription not found');
    }

    let subscription: Stripe.Subscription;

    if (immediately) {
      subscription = await this.stripe.subscriptions.cancel(
        localSubscription.stripeSubscriptionId
      );
    } else {
      subscription = await this.stripe.subscriptions.update(
        localSubscription.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );
    }

    // NOTE: No longer syncing to database - Stripe is source of truth
    // Invalidate cache immediately for this team
    await invalidateTeamCacheImmediately(teamId, 'subscription_change', {
      subscriptionId: subscription.id,
      cancelled: true,
      immediately,
    });

    return subscription;
  }

  /**
   * Create usage record in Stripe (for metered billing)
   * DEPRECATED: Usage Records API is deprecated in Stripe v19+
   * Use Stripe Billing Meters API instead
   */
  async recordUsage(
    subscriptionItemId: string,
    quantity: number,
    timestamp?: number
  ): Promise<any> {
    console.warn('recordUsage: Usage Records API is deprecated. Use Stripe Billing Meters API instead.');
    // TODO: Implement Stripe Billing Meters API
    // For now, return a mock response to prevent breaking existing code
    return {
      id: 'deprecated',
      object: 'usage_record',
      quantity,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Get subscription from Stripe
   */
  async getSubscription(teamId: string): Promise<Stripe.Subscription | null> {
    const localSubscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (!localSubscription?.stripeSubscriptionId) {
      return null;
    }

    try {
      return await this.stripe.subscriptions.retrieve(
        localSubscription.stripeSubscriptionId,
        { expand: ['items.data.price.product'] }
      );
    } catch (error) {
      console.error('Failed to retrieve subscription from Stripe:', error);
      return null;
    }
  }

  /**
   * List all subscriptions for a customer
   */
  async listSubscriptions(teamId: string): Promise<Stripe.Subscription[]> {
    const customer = await this.createOrGetCustomer(teamId);
    
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customer.id,
      expand: ['data.items.data.price.product'],
    });

    return subscriptions.data;
  }

  /**
   * Create setup intent for payment method collection
   */
  async createSetupIntent(teamId: string): Promise<Stripe.SetupIntent> {
    const customer = await this.createOrGetCustomer(teamId);

    return await this.stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session',
    });
  }

  /**
   * Get invoices from Stripe
   */
  async getInvoices(teamId: string): Promise<Stripe.Invoice[]> {
    const customer = await this.createOrGetCustomer(teamId);
    
    const invoices = await this.stripe.invoices.list({
      customer: customer.id,
      expand: ['data.subscription'],
    });

    return invoices.data;
  }

  /**
   * Create invoice in Stripe
   */
  async createInvoice(
    teamId: string,
    items: Array<{ description: string; amount: number; quantity?: number }>
  ): Promise<Stripe.Invoice> {
    const customer = await this.createOrGetCustomer(teamId);

    // Create invoice items
    for (const item of items) {
      await this.stripe.invoiceItems.create({
        customer: customer.id,
        amount: Math.round(item.amount * 100), // Convert to cents
        currency: 'usd',
        description: item.description,
        quantity: item.quantity || 1,
      });
    }

    // Create and return the invoice
    return await this.stripe.invoices.create({
      customer: customer.id,
      auto_advance: false, // Don't automatically finalize
    });
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
    console.log(`🔔 [Webhook] Received event: ${event.type}`, {
      id: event.id,
      created: new Date(event.created * 1000).toISOString(),
    });

    switch (event.type) {
      case 'customer.subscription.created':
        console.log(`📝 [Webhook] New subscription created: ${(event.data.object as Stripe.Subscription).id}`);
        await this.invalidateSubscriptionCache(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        console.log(`🔄 [Webhook] Subscription updated: ${(event.data.object as Stripe.Subscription).id}`);
        await this.invalidateSubscriptionCache(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        console.log(`❌ [Webhook] Subscription deleted: ${(event.data.object as Stripe.Subscription).id}`);
        await this.invalidateSubscriptionCache(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        console.log(`💰 [Webhook] Invoice payment succeeded: ${(event.data.object as Stripe.Invoice).id}`);
        await this.invalidateCacheFromInvoice(event.data.object as Stripe.Invoice);
        await this.syncInvoiceToLocal(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        console.log(`⚠️ [Webhook] Invoice payment failed: ${(event.data.object as Stripe.Invoice).id}`);
        await this.invalidateCacheFromInvoice(event.data.object as Stripe.Invoice);
        await this.syncInvoiceToLocal(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.created':
        console.log(`📄 [Webhook] Invoice created: ${(event.data.object as Stripe.Invoice).id}`);
        await this.syncInvoiceToLocal(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.updated':
        console.log(`📝 [Webhook] Invoice updated: ${(event.data.object as Stripe.Invoice).id}`);
        await this.syncInvoiceToLocal(event.data.object as Stripe.Invoice);
        break;

      case 'product.created':
      case 'product.updated':
        await this.syncProductToLocal(event.data.object as Stripe.Product);
        break;

      case 'price.created':
      case 'price.updated':
        await this.syncPriceToLocal(event.data.object as Stripe.Price);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return { processed: false, type: event.type };
    }

    console.log(`✅ [Webhook] Successfully processed: ${event.type}`);
    return { processed: true, type: event.type };
  }

  /**
   * Invalidate subscription cache (Stripe-First Architecture)
   * REDIS DISABLED - no-op for now
   */
  private async invalidateSubscriptionCache(stripeSubscription: Stripe.Subscription): Promise<void> {
    try {
      const teamId = stripeSubscription.metadata.teamId;
      if (!teamId) {
        console.warn('⚠️ [Webhook] No teamId in subscription metadata');
        return;
      }

      console.log(`🗑️ [Webhook] Cache invalidation skipped (Redis disabled) for team ${teamId}`);
      
      // REDIS DISABLED - uncomment to re-enable
      // const { getGlobalCacheService } = await import('./redis-subscription-cache');
      // const cacheService = getGlobalCacheService();
      // await cacheService.invalidate(teamId);
      // console.log(`✅ [Webhook] Cache invalidated for team ${teamId}`);
    } catch (error) {
      console.error('❌ [Webhook] Failed to invalidate cache:', error);
    }
  }

  /**
   * Invalidate cache from invoice event
   */
  private async invalidateCacheFromInvoice(stripeInvoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = typeof stripeInvoice.subscription === 'string' 
      ? stripeInvoice.subscription 
      : stripeInvoice.subscription?.id;
      
    if (!subscriptionId) {
      return;
    }

    try {
      // Fetch subscription to get teamId from metadata
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      await this.invalidateSubscriptionCache(subscription);
    } catch (error) {
      console.error('❌ [Webhook] Failed to invalidate cache from invoice:', error);
    }
  }

  private async syncInvoiceToLocal(stripeInvoice: Stripe.Invoice): Promise<void> {
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
          amount: stripeInvoice.amount_due / 100, // Convert from cents
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
          amount: stripeInvoice.amount_due / 100,
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

    } catch (error) {
      console.error('Failed to sync invoice to local DB:', error);
    }
  }

  private async syncProductToLocal(stripeProduct: Stripe.Product): Promise<void> {
    try {
      console.log(`🔄 Syncing product from Stripe: ${stripeProduct.name} (${stripeProduct.id})`);

      // Get the associated price for this product
      const prices = await this.stripe.prices.list({
        product: stripeProduct.id,
        active: true,
        limit: 1,
      });

      const price = prices.data[0];
      if (!price) {
        console.warn(`No active price found for product ${stripeProduct.id}`);
        return;
      }

      // Extract tier from metadata
      const tier = stripeProduct.metadata.tier;
      if (!tier) {
        console.warn(`No tier metadata found for product ${stripeProduct.id}`);
        return;
      }

      // Update or create local product record
      await prisma.stripeProduct.upsert({
        where: { stripeProductId: stripeProduct.id },
        create: {
          stripeProductId: stripeProduct.id,
          stripePriceId: price.id,
          name: stripeProduct.name,
          description: stripeProduct.description,
          tier: tier as any,
          unitAmount: price.unit_amount || 0,
          currency: price.currency,
          interval: price.recurring?.interval || 'month',
          intervalCount: price.recurring?.interval_count || 1,
          active: stripeProduct.active,
          metadata: {
            stripeProductMetadata: stripeProduct.metadata,
            stripePriceMetadata: price.metadata,
          },
        },
        update: {
          stripePriceId: price.id,
          name: stripeProduct.name,
          description: stripeProduct.description,
          tier: tier as any,
          unitAmount: price.unit_amount || 0,
          currency: price.currency,
          interval: price.recurring?.interval || 'month',
          intervalCount: price.recurring?.interval_count || 1,
          active: stripeProduct.active,
          metadata: {
            stripeProductMetadata: stripeProduct.metadata,
            stripePriceMetadata: price.metadata,
          },
        },
      });

      // Also update local tier configuration if it exists
      if (tier) {
        try {
          const featureFlags = stripeProduct.metadata.featureFlags ? 
            JSON.parse(stripeProduct.metadata.featureFlags) : [];

          await prisma.subscriptionTierConfig.upsert({
            where: { tier: tier as any },
            create: {
              tier: tier as any,
              name: stripeProduct.name,
              description: stripeProduct.description,
              basePrice: parseFloat(stripeProduct.metadata.basePrice || '0'),
              billingInterval: stripeProduct.metadata.billingInterval || 'month',
              includedSeats: parseInt(stripeProduct.metadata.includedSeats || '1'),
              includedLocations: parseInt(stripeProduct.metadata.includedLocations || '1'),
              includedRefreshes: parseInt(stripeProduct.metadata.includedRefreshes || '24'),
              pricePerSeat: parseFloat(stripeProduct.metadata.pricePerSeat || '0'),
              pricePerLocation: parseFloat(stripeProduct.metadata.pricePerLocation || '0'),
              pricePerRefresh: parseFloat(stripeProduct.metadata.pricePerRefresh || '0'),
              enabledFeatures: featureFlags,
              popular: stripeProduct.metadata.popular === 'true',
              highlighted: stripeProduct.metadata.highlighted === 'true',
              sortOrder: parseInt(stripeProduct.metadata.sortOrder || '0'),
              active: stripeProduct.active,
            },
            update: {
              name: stripeProduct.name,
              description: stripeProduct.description,
              basePrice: parseFloat(stripeProduct.metadata.basePrice || '0'),
              billingInterval: stripeProduct.metadata.billingInterval || 'month',
              includedSeats: parseInt(stripeProduct.metadata.includedSeats || '1'),
              includedLocations: parseInt(stripeProduct.metadata.includedLocations || '1'),
              includedRefreshes: parseInt(stripeProduct.metadata.includedRefreshes || '24'),
              pricePerSeat: parseFloat(stripeProduct.metadata.pricePerSeat || '0'),
              pricePerLocation: parseFloat(stripeProduct.metadata.pricePerLocation || '0'),
              pricePerRefresh: parseFloat(stripeProduct.metadata.pricePerRefresh || '0'),
              enabledFeatures: featureFlags,
              popular: stripeProduct.metadata.popular === 'true',
              highlighted: stripeProduct.metadata.highlighted === 'true',
              sortOrder: parseInt(stripeProduct.metadata.sortOrder || '0'),
              active: stripeProduct.active,
            },
          });
        } catch (error) {
          console.warn('Failed to sync tier configuration:', error);
        }
      }

      console.log(`✅ Product synced successfully: ${stripeProduct.name}`);
    } catch (error) {
      console.error('Failed to sync product to local DB:', error);
    }
  }

  private async syncPriceToLocal(stripePrice: Stripe.Price): Promise<void> {
    try {
      console.log(`🔄 Syncing price from Stripe: ${stripePrice.nickname || stripePrice.id}`);

      // Get the associated product
      const product = await this.stripe.products.retrieve(stripePrice.product as string);
      
      // Update the product record with new price information
      await prisma.stripeProduct.updateMany({
        where: { stripeProductId: product.id },
        data: {
          stripePriceId: stripePrice.id,
          unitAmount: stripePrice.unit_amount || 0,
          currency: stripePrice.currency,
          interval: stripePrice.recurring?.interval || 'month',
          intervalCount: stripePrice.recurring?.interval_count || 1,
          metadata: {
            stripeProductMetadata: product.metadata,
            stripePriceMetadata: stripePrice.metadata,
          },
        },
      });

      // Also update tier configuration if product has tier metadata
      if (product.metadata.tier && product.metadata.basePrice) {
        await prisma.subscriptionTierConfig.updateMany({
          where: { tier: product.metadata.tier as any },
          data: {
            basePrice: parseFloat(product.metadata.basePrice),
            billingInterval: product.metadata.billingInterval || 'month',
      },
    });
  }

      console.log(`✅ Price synced successfully: ${stripePrice.nickname || stripePrice.id}`);
    } catch (error) {
      console.error('Failed to sync price to local DB:', error);
    }
  }
}
