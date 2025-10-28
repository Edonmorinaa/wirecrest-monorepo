/**
 * Subscription Calculation API Route
 * POST /api/billing/calculate - Calculate subscription pricing
 */

import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth-next';
import { BillingService } from '@wirecrest/billing';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, tier, overrides } = body;

    // Verify user has access to this team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }

    const billingService = new BillingService();
    const calculation = await billingService.calculateSubscription(teamId, tier, overrides);

    return NextResponse.json(calculation);
  } catch (error) {
    console.error('Failed to calculate subscription:', error);
    return NextResponse.json(
      { error: 'Failed to calculate subscription' },
      { status: 500 }
    );
  }
}
