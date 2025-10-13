/**
 * Stripe Checkout Session API Route
 * POST /api/billing/checkout - Create a checkout session for subscription payment
 */

import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth/server';
import { StripeService } from '@wirecrest/billing';
import { NextRequest, NextResponse } from 'next/server';

const stripe = StripeService.getStripeInstance();

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, priceId, successUrl, cancelUrl } = body;

    if (!teamId || !priceId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify user has access to this team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
      include: {
        team: true,
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const team = teamMember.team;

    // Get or create Stripe customer (stored directly on Team in Stripe-First architecture)
    let customerId = team.stripeCustomerId;

    if (!customerId) {
      // Create a new customer
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        name: team.name,
        metadata: {
          teamId: team.id,
        },
      });
      customerId = customer.id;

      // Update team with customer ID (Stripe-First architecture)
      await prisma.team.update({
        where: { id: team.id },
        data: {
          stripeCustomerId: customerId,
        },
      });
      
      console.log(`✅ Created Stripe customer ${customerId} for team ${team.id}`);
    }

    // Check for any existing subscriptions in Stripe for this customer
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });

    // Cancel any incomplete or unpaid subscriptions
    for (const sub of existingSubscriptions.data) {
      if (['incomplete', 'incomplete_expired', 'unpaid'].includes(sub.status)) {
        console.log(`🧹 Canceling incomplete subscription: ${sub.id} (status: ${sub.status})`);
        try {
          await stripe.subscriptions.cancel(sub.id);
          console.log(`✅ Canceled incomplete subscription: ${sub.id}`);
        } catch (error) {
          console.warn(`⚠️ Failed to cancel subscription ${sub.id}:`, error);
        }
      } else if (['active', 'trialing', 'past_due'].includes(sub.status)) {
        // Customer already has an active subscription
        console.warn(`⚠️ Team ${team.id} already has active subscription ${sub.id}`);
        return NextResponse.json(
          { error: 'Customer already has an active subscription in Stripe' },
          { status: 400 }
        );
      }
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${request.nextUrl.origin}/user/account/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/user/account/billing`,
      metadata: {
        teamId: team.id,
      },
      subscription_data: {
        metadata: {
          teamId: team.id,
        },
      },
      payment_method_collection: 'always',
      billing_address_collection: 'auto',
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
