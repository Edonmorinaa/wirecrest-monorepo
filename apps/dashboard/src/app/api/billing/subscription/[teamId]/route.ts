/**
 * Team Subscription API Route
 * GET /api/billing/subscription/[teamId] - Get team subscription details
 */

import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth/server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: { teamId: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
      },
    });

    // Verify user has access to this team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
      },
      include: {
        team: true,
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }

    // Get subscription details
    const subscription = await prisma.teamSubscription.findUnique({
      where: { teamId },
      include: {
        team: {
          select: { name: true, slug: true },
        },
        overrides: {
          where: {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        },
      },
    });

    if (!subscription) {
      // Return default free subscription
      return NextResponse.json({
        id: `default-${teamId}`,
        teamId,
        tier: 'FREE',
        status: 'ACTIVE',
        currentSeats: team?.members?.length || 1,
        currentLocations: 0,
        enabledFeatures: [],
        trialEnd: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
    }

    // Apply overrides
    const enabledFeatures = [...subscription.enabledFeatures];
    subscription.overrides.forEach(override => {
      if (override.type === 'FEATURE' && override.key.startsWith('feature_')) {
        const featureName = override.key.replace('feature_', '');
        if (JSON.parse(override.value as string) === true) {
          if (!enabledFeatures.includes(featureName)) {
            enabledFeatures.push(featureName);
          }
        } else {
          const index = enabledFeatures.indexOf(featureName);
          if (index > -1) {
            enabledFeatures.splice(index, 1);
          }
        }
      }
    });

    const response = {
      id: subscription.id,
      teamId: subscription.teamId,
      tier: subscription.tier,
      status: subscription.status,
      currentSeats: subscription.currentSeats,
      currentLocations: subscription.currentLocations,
      enabledFeatures,
      trialEnd: subscription.trialEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
