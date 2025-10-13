/**
 * Simple Stripe Product Webhook Handler
 * 
 * Handles webhook events for product changes.
 */

import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  StripeService,
  getGlobalFeatureChecker,
  createProductWebhookHandler,
} from '@wirecrest/billing';

// export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook endpoint hit!');
  
  const rawBody = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  console.log('📝 Webhook signature:', signature ? 'present' : 'missing');
  console.log('📝 Webhook body length:', rawBody.length);

  if (!signature) {
    console.error('❌ Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Missing STRIPE_SECRET_KEY environment variable');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    // Use the global FeatureChecker instance to ensure cache sharing
    const featureChecker = getGlobalFeatureChecker();

    // Initialize webhook handler with feature checker for cache clearing
    const webhookHandler = createProductWebhookHandler({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      featureChecker,
    });

    // Verify webhook signature
    const stripe = StripeService.getStripeInstance();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('Missing webhook secret');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    console.log(`🔍 Processing webhook event: ${event.type}`);
    
    // Handle subscription and billing events with BillingService
    if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
         'invoice.payment_succeeded', 'invoice.payment_failed', 'invoice.created', 'invoice.updated'].includes(event.type)) {
      const { BillingService } = await import('@wirecrest/billing/server-only');
      const billingService = new BillingService();
      await billingService.handleWebhook(rawBody, signature);
      console.log(`✅ [BillingService] Handled event: ${event.type}`);
    }
    
    // Also handle product changes for cache invalidation
    await webhookHandler.handleWebhookEvent(event);

    console.log(`✅ Handled webhook event: ${event.type}`);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Error handling product webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/stripe
 * 
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'stripe-webhook',
    configured: !!(process.env.STRIPE_SECRET_KEY && (process.env.STRIPE_PRODUCT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET)),
    timestamp: new Date().toISOString()
  });
}
