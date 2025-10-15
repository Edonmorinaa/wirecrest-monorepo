'use server';

import { prisma } from '@wirecrest/db';
import { SuperRole } from '@prisma/client';
import { getSession } from '@wirecrest/auth/server';

import { ApiError, recordMetric } from './lib';

// Superadmin Team Management Actions
export async function getAllTeams() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check if user is super admin
  if (session.user.superRole !== SuperRole.ADMIN) {
    throw new ApiError(403, 'Forbidden');
  }

  const teams = await prisma.team.findMany({
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              superRole: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return teams;
}

export async function getTeamById(teamId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check if user is super admin
  if (session.user.superRole !== SuperRole.ADMIN) {
    throw new ApiError(403, 'Forbidden');
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              superRole: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  return team;
}

export async function updateTeamById(teamId: string, data: { name?: string; slug?: string; domain?: string }) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check if user is super admin
  if (session.user.superRole !== SuperRole.ADMIN) {
    throw new ApiError(403, 'Forbidden');
  }

  const team = await prisma.team.update({
    where: { id: teamId },
    data: {
      name: data.name,
      slug: data.slug,
      domain: data.domain,
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              superRole: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  recordMetric('superadmin.team.updated');

  return team;
}

export async function deleteTeamById(teamId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check if user is super admin
  if (session.user.superRole !== SuperRole.ADMIN) {
    throw new ApiError(403, 'Forbidden');
  }

  await prisma.team.delete({
    where: { id: teamId },
  });

  recordMetric('superadmin.team.deleted');

  return { success: true };
}

export async function createTeam(data: { name: string; slug: string; domain?: string }) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check if user is super admin
  if (session.user.superRole !== SuperRole.ADMIN) {
    throw new ApiError(403, 'Forbidden');
  }

  const team = await prisma.team.create({
    data: {
      name: data.name,
      slug: data.slug,
      domain: data.domain,
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  recordMetric('superadmin.team.created');

  return team;
}

/**
 * Get comprehensive platform data for a team
 * Fetches market identifiers, business profiles, review counts, and sync status
 */
export async function getTeamPlatformData(teamId: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check if user is super admin
  if (session.user.superRole !== SuperRole.ADMIN) {
    throw new ApiError(403, 'Forbidden');
  }

  try {
    // Fetch market identifiers
    const identifiers = await prisma.businessMarketIdentifier.findMany({
      where: { teamId },
      select: {
        id: true,
        platform: true,
        identifier: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Fetch platform profiles and counts in parallel
    const [google, facebook, tripadvisor, booking, instagram, tiktok] = await Promise.all([
      prisma.googleBusinessProfile.findFirst({
        where: { teamId },
        select: {
          id: true,
          placeId: true,
          rating: true,
          lastScrapedAt: true,
          _count: { select: { reviews: true } },
        },
      }),
      prisma.facebookBusinessProfile.findFirst({
        where: { teamId },
        select: {
          id: true,
          facebookUrl: true,
          _count: { select: { reviews: true } },
        },
      }),
      prisma.tripAdvisorBusinessProfile.findFirst({
        where: { teamId },
        select: {
          id: true,
          tripAdvisorUrl: true,
          rating: true,
          _count: { select: { reviews: true } },
        },
      }),
      prisma.bookingBusinessProfile.findFirst({
        where: { teamId },
        select: {
          id: true,
          bookingUrl: true,
          rating: true,
          _count: { select: { reviews: true } },
        },
      }),
      prisma.instagramBusinessProfile.findFirst({
        where: { teamId },
        select: {
          id: true,
          username: true,
          fullName: true,
          _count: { select: { dailySnapshots: true } },
        },
      }),
      prisma.tikTokBusinessProfile.findFirst({
        where: { teamId },
        select: {
          id: true,
          username: true,
          _count: { select: { dailySnapshots: true } },
        },
      }),
    ]);

    // Fetch sync status from scraper API
    let syncStatus = null;
    try {
      const scraperUrl = process.env.SCRAPER_API_URL || process.env.NEXT_PUBLIC_SCRAPER_API_URL;
      if (scraperUrl) {
        const response = await fetch(`${scraperUrl}/api/sync-status/${teamId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          // Add timeout
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.ok) {
          syncStatus = await response.json();
        }
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
      // Continue without sync status - it's not critical
    }

    // Get last review dates for each platform
    const [googleLastReview, facebookLastReview, tripadvisorLastReview, bookingLastReview] = await Promise.all([
      google ? prisma.googleReview.findFirst({
        where: { businessProfileId: google.id },
        orderBy: { publishedAtDate: 'desc' },
        select: { publishedAtDate: true },
      }) : null,
      facebook ? prisma.facebookReview.findFirst({
        where: { businessProfileId: facebook.id },
        orderBy: { date: 'desc' },
        select: { date: true },
      }) : null,
      tripadvisor ? prisma.tripAdvisorReview.findFirst({
        where: { businessProfileId: tripadvisor.id },
        orderBy: { publishedDate: 'desc' },
        select: { publishedDate: true },
      }) : null,
      booking ? prisma.bookingReview.findFirst({
        where: { businessProfileId: booking.id },
        orderBy: { publishedDate: 'desc' },
        select: { publishedDate: true },
      }) : null,
    ]);

    return {
      identifiers,
      profiles: {
        google: google ? {
          ...google,
          lastReviewDate: googleLastReview?.publishedAtDate || null,
        } : null,
        facebook: facebook ? {
          ...facebook,
          lastReviewDate: facebookLastReview?.date || null,
        } : null,
        tripadvisor: tripadvisor ? {
          ...tripadvisor,
          lastReviewDate: tripadvisorLastReview?.publishedDate || null,
        } : null,
        booking: booking ? {
          ...booking,
          lastReviewDate: bookingLastReview?.publishedDate || null,
        } : null,
        instagram,
        tiktok,
      },
      syncStatus,
    };
  } catch (error) {
    console.error('Error fetching team platform data:', error);
    throw new ApiError(500, 'Failed to fetch platform data');
  }
}
