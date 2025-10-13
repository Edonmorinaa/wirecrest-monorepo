/**
 * Stripe Webhook Controller
 * Handles Stripe subscription lifecycle events
 */

import { Request, Response } from 'express';
import Stripe from 'stripe';
import { SubscriptionOrchestrator } from '../services/subscription/SubscriptionOrchestrator';
import { StripeService } from '@wirecrest/billing/server-only';
import { prisma } from '@wirecrest/db';

const stripe = StripeService.getStripeInstance();

export class StripeWebhookController {
  private orchestrator: SubscriptionOrchestrator;
  private webhookSecret: string;

  constructor(apifyToken: string, webhookBaseUrl: string, stripeWebhookSecret: string) {
    this.orchestrator = new SubscriptionOrchestrator(apifyToken, webhookBaseUrl);
    this.webhookSecret = stripeWebhookSecret;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, this.webhookSecret);
    } catch (err: any) {
      console.error('⚠️  Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    console.log(`✅ Stripe webhook received: ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.created':
          await this.handleCustomerCreated(event.data.object as Stripe.Customer);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.paused':
          await this.handleSubscriptionPaused(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Error processing Stripe webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  }

  /**
   * Handle customer created event
   * This is triggered when a new customer is created in Stripe
   * Usually happens before subscription, so we just log it
   */
  private async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
    console.log('👤 Handling customer.created:', customer.id);
    
    // Customer created - usually no action needed until they subscribe
    // But we can log it for tracking purposes
    console.log(`✅ New customer created: ${customer.email} (ID: ${customer.id})`);
  }

  /**
   * Handle subscription created event
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    console.log('📦 Handling subscription.created:', subscription.id);

    // Get team ID from customer ID
    const teamId = await this.getTeamIdFromCustomer(subscription.customer as string);

    if (!teamId) {
      console.error('No team found for customer:', subscription.customer);
      return;
    }

    // Trigger initial data fetch and setup schedules
    const result = await this.orchestrator.handleNewSubscription(teamId);

    console.log('✅ Subscription setup result:', result);
  }

  /**
   * Handle subscription updated event
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log('🔄 Handling subscription.updated:', subscription.id);

    const teamId = await this.getTeamIdFromCustomer(subscription.customer as string);

    if (!teamId) {
      console.error('No team found for customer:', subscription.customer);
      return;
    }

    // Update schedules based on new subscription tier/features
    const result = await this.orchestrator.handleSubscriptionUpdate(teamId);

    console.log('✅ Subscription update result:', result);
  }

  /**
   * Handle subscription deleted event
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('🗑️  Handling subscription.deleted:', subscription.id);

    const teamId = await this.getTeamIdFromCustomer(subscription.customer as string);

    if (!teamId) {
      console.error('No team found for customer:', subscription.customer);
      return;
    }

    // Delete all schedules
    const result = await this.orchestrator.handleSubscriptionCancellation(teamId);

    console.log('✅ Subscription cancellation result:', result);
  }

  /**
   * Handle subscription paused event
   */
  private async handleSubscriptionPaused(subscription: Stripe.Subscription): Promise<void> {
    console.log('⏸️  Handling subscription.paused:', subscription.id);

    const teamId = await this.getTeamIdFromCustomer(subscription.customer as string);

    if (!teamId) {
      console.error('No team found for customer:', subscription.customer);
      return;
    }

    // Pause all schedules (implementation can be similar to cancellation)
    // For now, we'll just log it
    console.log('⚠️  Subscription paused for team:', teamId);
  }

  /**
   * Get team ID from Stripe customer ID
   */
  private async getTeamIdFromCustomer(customerId: string): Promise<string | null> {
    const team = await prisma.team.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });

    return team?.id || null;
  }
}

