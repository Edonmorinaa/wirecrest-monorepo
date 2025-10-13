/**
 * Subscription Upgrade API Route
 * POST /api/billing/subscription/upgrade - Upgrade team subscription
 */

import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth/server';
import { BillingService } from '@wirecrest/billing';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, tier, seats, locations } = body;

    // Verify user has admin access to this team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team not found or insufficient permissions' }, { status: 404 });
    }

    const billingService = new BillingService();

    // Check if this is a downgrade to free
    if (tier === 'FREE') {
      await billingService.updateSubscription(teamId, {
        tier: 'FREE',
        seats: seats || 1,
        locations: locations || 0,
      });

      return NextResponse.json({ success: true });
    }

    // For paid tiers, create/update subscription
    const existingSubscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
    });

    if (existingSubscription && existingSubscription.stripeSubscriptionId) {
      // Update existing subscription
      await billingService.updateSubscription(teamId, {
        tier,
        seats,
        locations,
      });

      return NextResponse.json({ success: true });
    } else {
      // Create new subscription
      const result = await billingService.createSubscription({
        teamId,
        tier,
        trialDays: 14, // 14-day trial for new subscriptions
      });

      return NextResponse.json({ 
        success: true, 
        subscriptionId: result.subscriptionId,
        clientSecret: result.clientSecret,
      });
    }
  } catch (error) {
    console.error('Failed to upgrade subscription:', error);
    return NextResponse.json(
      { error: 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
}
