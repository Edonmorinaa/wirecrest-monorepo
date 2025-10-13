/**
 * Team Subscription API
 * GET /api/teams/[teamId]/subscription
 * 
 * Returns current subscription status for a team
 */

import { prisma } from '@wirecrest/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: { teamId: string } }
) {
  try {
    const { teamId } = context.params;

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Get team subscription
    const subscription = await prisma.teamSubscription.findFirst({
      where: { teamId },
      select: {
        status: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          status: 'NONE',
          plan: 'none',
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
          stripeCustomerId: null,
        },
        { status: 200 }
      );
    }

    // Determine plan name from price ID
    // You might want to fetch this from Stripe or have a mapping
    const planName = getPlanNameFromPriceId(subscription.stripePriceId);

    return NextResponse.json({
      status: subscription.status,
      plan: planName,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
      stripeCustomerId: subscription.stripeCustomerId,
      metadata: {
        demo: subscription.status === 'DEMO' || planName.toLowerCase().includes('demo'),
      },
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}

/**
 * Helper to determine plan name from price ID
 * You should customize this based on your Stripe configuration
 */
function getPlanNameFromPriceId(priceId: string | null): string {
  if (!priceId) return 'none';

  // Map of price IDs to plan names
  // Update these with your actual Stripe price IDs
  const priceMap: Record<string, string> = {
    // Add your price mappings here
    // Example:
    // 'price_xxx': 'STARTER',
    // 'price_yyy': 'PROFESSIONAL',
    // 'price_zzz': 'ENTERPRISE',
  };

  return priceMap[priceId] || 'unknown';
}

