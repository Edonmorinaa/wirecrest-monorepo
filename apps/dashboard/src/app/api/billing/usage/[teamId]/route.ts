/**
 * Usage Analytics API Route
 * GET /api/billing/usage/[teamId] - Get team usage analytics
 */

import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth-next';
import { BillingService } from '@wirecrest/billing';
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
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

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
    const usage = await billingService.getUsageAnalytics(teamId, days);

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Failed to fetch usage analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage analytics' },
      { status: 500 }
    );
  }
}
