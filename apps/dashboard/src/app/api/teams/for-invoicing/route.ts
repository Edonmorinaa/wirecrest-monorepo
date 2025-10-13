/**
 * Teams for Invoicing API Route
 * GET /api/teams/for-invoicing - Get teams that can be invoiced
 */

import { Role } from '@prisma/client';
import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    if (session.user.superRole !== 'ADMIN' && session.user.superRole !== 'SUPPORT') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Get teams with subscription data
    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        subscription: {
          select: {
            tier: true,
            status: true,
            stripeCustomerId: true,
          },
        },
        members: {
          select: {
            user: true,
            role: true,
          },
        },
        _count: {
          select: {
            members: true
          },
        },
      },
      orderBy: { name: 'asc' },
      take: 50, // Limit results for performance
    });

    // Transform teams to match address book format expected by the UI
    const transformedTeams = teams.flatMap((team) => {
      const ownerUser = team.members.find((member) => member.role === Role.OWNER);
      if (!ownerUser) {
        return [];
      }

      return {
        id: team.id,
        name: team.name,
        company: team.name,
        email: ownerUser.user.email, // Placeholder - you'd get real email from team owner
        phoneNumber: '+1-555-0000', // Placeholder
        address: "123 Team Street",
        zipCode: '12345',
        city: 'Team City',
        state: 'CA',
        country: 'USA',
  
        // Additional team info for display
        slug: team.slug,
        memberCount: team._count.members,
        subscriptionTier: team.subscription?.tier || 'FREE',
        subscriptionStatus: team.subscription?.status || 'ACTIVE',
        hasStripeCustomer: !!team.subscription?.stripeCustomerId,
      }
    });

    return NextResponse.json(transformedTeams);
  } catch (error) {
    console.error('Failed to fetch teams for invoicing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}
