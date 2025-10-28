'use server';


import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth-next';
import { MarketPlatform } from '@prisma/client';
import {
  createBusinessMarketIdentifier,
  getAllBusinessMarketIdentifiers,
} from '@/models/business-market-identifier';

import { throwIfNotSuperAdmin } from 'src/lib/permissions';
import { validateWithSchema, createBusinessMarketIndetifiersSchema } from 'src/lib/zod';

import { ApiError, recordMetric } from './lib';

// Business Market Identifiers Actions
export async function getBusinessMarketIdentifiers(teamSlug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this team.');
  }

  const marketIdentifiers = await getAllBusinessMarketIdentifiers(team.id);

  recordMetric('business-market-identifier.fetched');

  return marketIdentifiers;
}

export async function createBusinessMarketIdentifierAction(
  teamSlug: string,
  data: { platform: MarketPlatform; identifier: string }
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this team.');
  }

  const { platform, identifier } = validateWithSchema(createBusinessMarketIndetifiersSchema, data);

  if (!Object.values(MarketPlatform).includes(platform as MarketPlatform)) {
    throw new ApiError(400, 'Invalid platform');
  }

  // Create a new business market identifier
  const marketIdentifier = await createBusinessMarketIdentifier(
    {
      identifier,
      teamId: team.id,
      platform: platform as MarketPlatform,
    },
    team.id,
    platform as MarketPlatform
  );

  return marketIdentifier;
}

// Google Business Profile Actions
export async function getGoogleBusinessProfile(teamSlug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this team.');
  }

  const profile = await prisma.googleBusinessProfile.findFirst({
    where: { teamId: team.id },
    include: {
      overview: {
        include: {
          periodicalMetrics: {
            orderBy: { periodKey: 'asc' },
          },
        },
      },
      location: true,
      categories: true,
      photos: {
        take: 5,
      },
      openingHours: {
        include: {
          periods: true,
        },
      },
      currentOpeningHours: {
        include: {
          periods: true,
        },
      },
      regularOpeningHours: {
        include: {
          periods: true,
        },
      },
      additionalInfo: {
        include: {
          items: true,
        },
      },
      popularTimesHistogram: true,
      questionsAndAnswers: {
        include: {
          answers: true,
        },
      },
      metadata: true,
    },
  });

  return profile;
}

// DEPRECATED: Profile creation moved to scraper
// Use admin.createOrUpdateMarketIdentifier + admin.executePlatformAction instead
export async function createGoogleProfile(teamSlug: string, data: { placeId: string }) {
  await throwIfNotSuperAdmin();

  const { placeId } = data;

  if (!placeId) {
    throw new ApiError(400, 'Place ID is required');
  }

  // Get team by slug
  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  console.log('⚠️ DEPRECATED: createGoogleProfile called. Use admin actions instead.');
  console.log('Creating Google profile for team:', team.id, 'with placeId:', placeId);

  // Import admin actions
  const { createOrUpdateMarketIdentifier, executePlatformAction } = await import('./admin');

  // Step 1: Create/update market identifier
  await createOrUpdateMarketIdentifier({
    teamId: team.id,
    platform: 'GOOGLE_MAPS',
    identifier: placeId,
  });

  // Step 2: Execute platform action (delegates to scraper)
  const result = await executePlatformAction({
    teamId: team.id,
    platform: "GOOGLE_MAPS",
    action: 'create_profile',
  });

  return { data: result, message: 'Profile creation initiated via scraper' };
}

export async function getGoogleReviewsAction(
  teamSlug: string,
  data: { placeId: string; forceRefresh?: boolean }
) {
  await throwIfNotSuperAdmin();

  const { placeId, forceRefresh } = data;

  if (!placeId) {
    throw new ApiError(400, 'Place ID is required');
  }

  // Get team by slug
  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  console.log('Fetching Google reviews for team:', team.id, 'with placeId:', placeId);

  // Check if Google business profile exists for this team
  const existingProfile = await prisma.googleBusinessProfile.findFirst({
    where: { teamId: team.id },
  });

  if (!existingProfile) {
    throw new ApiError(
      404,
      'Google business profile not found. Please create the profile first using the superadmin panel.'
    );
  }

  console.log('Google business profile exists, proceeding with review fetch...');

  // Call the backend API to fetch reviews
  const backendResponse = await fetch(`${process.env.BACKEND_URL}/api/google/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      teamId: team.id,
      placeId,
      forceRefresh: forceRefresh || false,
    }),
  });

  if (!backendResponse.ok) {
    const errorData = await backendResponse.json();
    console.error('Backend error fetching Google reviews:', errorData);
    throw new Error(errorData.error || 'Failed to fetch Google reviews');
  }

  const data_response = await backendResponse.json();
  console.log('Google reviews fetched successfully:', data_response);

  return { data: data_response };
}

// Facebook Business Profile Actions
export async function getFacebookBusinessProfile(teamSlug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this team.');
  }

  const profile = await prisma.facebookBusinessProfile.findFirst({
    where: { teamId: team.id },
    include: {
      overview: {
        include: {
          sentimentAnalysis: true,
          emotionalAnalysis: true,
          reviewQuality: true,
          contentLength: true,
          keywords: {
            orderBy: { count: 'desc' },
            take: 20,
          },
          tags: {
            orderBy: { count: 'desc' },
            take: 20,
          },
          topics: {
            orderBy: { count: 'desc' },
            take: 10,
          },
          competitorMentions: {
            orderBy: { count: 'desc' },
            take: 10,
          },
          recentReviews: {
            orderBy: { reviewDate: 'desc' },
            take: 10,
          },
          reviewsTrends: {
            orderBy: { periodStart: 'desc' },
            take: 12,
          },
          seasonalPatterns: {
            orderBy: { monthNumber: 'asc' },
          },
          recommendationDistribution: true,
          facebookPeriodicalMetric: {
            orderBy: { periodKey: 'asc' },
            include: {
              keywords: {
                orderBy: { count: 'desc' },
                take: 10,
              },
              tags: {
                orderBy: { count: 'desc' },
                take: 10,
              },
              topics: {
                orderBy: { count: 'desc' },
                take: 5,
              },
              emotionalBreakdown: true,
            },
          },
        },
      },
    },
  });

  return profile;
}

// DEPRECATED: Profile creation moved to scraper
// Use admin.createOrUpdateMarketIdentifier + admin.executePlatformAction instead
export async function createFacebookProfile(teamSlug: string, data: { facebookUrl: string }) {
  await throwIfNotSuperAdmin();

  const { facebookUrl } = data;

  if (!facebookUrl) {
    throw new ApiError(400, 'Facebook URL is required');
  }

  // Get team by slug
  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  console.log('⚠️ DEPRECATED: createFacebookProfile called. Use admin actions instead.');
  console.log('Creating Facebook profile for team:', team.id, 'with URL:', facebookUrl);

  // Import admin actions
  const { createOrUpdateMarketIdentifier, executePlatformAction } = await import('./admin');

  // Step 1: Create/update market identifier
  await createOrUpdateMarketIdentifier({
    teamId: team.id,
    platform: 'FACEBOOK',
    identifier: facebookUrl,
  });

  // Step 2: Execute platform action (delegates to scraper)
  const result = await executePlatformAction({
    teamId: team.id,
    platform: 'FACEBOOK',
    action: 'create_profile',
  });

  return { data: result, message: 'Profile creation initiated via scraper' };
}

export async function getFacebookReviewsAction(
  teamSlug: string,
  data: { facebookUrl: string; forceRefresh?: boolean }
) {
  await throwIfNotSuperAdmin();

  const { facebookUrl, forceRefresh } = data;

  if (!facebookUrl) {
    throw new ApiError(400, 'Facebook URL is required');
  }

  // Get team by slug
  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  console.log('Fetching Facebook reviews for team:', team.id, 'with URL:', facebookUrl);

  // Call the backend API
  const backendResponse = await fetch(`${process.env.BACKEND_URL}/api/facebook/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      teamId: team.id,
      facebookUrl,
      forceRefresh: forceRefresh || false,
    }),
  });

  if (!backendResponse.ok) {
    const errorData = await backendResponse.json();
    console.error('Backend error fetching Facebook reviews:', errorData);
    throw new Error(errorData.error || 'Failed to fetch Facebook reviews');
  }

  const data_response = await backendResponse.json();
  console.log('Facebook reviews fetched successfully:', data_response);

  return { data: data_response };
}

// Instagram Business Profile Actions
export async function getInstagramBusinessProfile(teamSlug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this team.');
  }

  const profile = await prisma.instagramBusinessProfile.findFirst({
    where: { teamId: team.id },
    include: {
      dailySnapshots: {
        orderBy: { snapshotDate: 'desc' },
        take: 30,
      },
      mediaSnapshots: {
        orderBy: { snapshotAt: 'desc' },
        take: 10,
      },
      commentSnapshots: {
        orderBy: { snapshotAt: 'desc' },
        take: 10,
      },
      weeklyAggregations: {
        orderBy: { weekStartDate: 'desc' },
        take: 12,
      },
      monthlyAggregations: {
        orderBy: { monthStartDate: 'desc' },
        take: 12,
      },
      snapshotSchedule: true,
    },
  });

  return profile;
}

// TikTok Business Profile Actions
export async function getTikTokBusinessProfile(teamSlug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this team.');
  }

  const profile = await prisma.tikTokBusinessProfile.findFirst({
    where: { teamId: team.id },
    include: {
      dailySnapshots: {
        orderBy: { snapshotDate: 'desc' },
        take: 30,
      },
      snapshotSchedule: true,
    },
  });

  return profile;
}

// Platform Status Actions
export async function getPlatformStatus(teamSlug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Check if user is a member of this team
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'Access denied. You must be a member of this team.');
  }

  // Get platform profiles
  const [googleProfile, facebookProfile, instagramProfile] = await Promise.all([
    prisma.googleBusinessProfile.findFirst({
      where: { teamId: team.id },
      include: { overview: true },
    }),
    prisma.facebookBusinessProfile.findFirst({
      where: { teamId: team.id },
      include: { overview: true },
    }),
    prisma.instagramBusinessProfile.findFirst({
      where: { teamId: team.id },
      include: { dailySnapshots: { take: 1 } },
    }),
  ]);

  return {
    google: {
      connected: !!googleProfile,
      profile: googleProfile,
      hasOverview: !!googleProfile?.overview,
    },
    facebook: {
      connected: !!facebookProfile,
      profile: facebookProfile,
      hasOverview: !!facebookProfile?.overview,
    },
    instagram: {
      connected: !!instagramProfile,
      profile: instagramProfile,
      hasSnapshots: !!instagramProfile?.dailySnapshots?.length,
    },
  };
}

// Business Profile Management Functions







export async function getBookingBusinessProfile(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!team || team.members.length === 0) {
    throw new ApiError(403, 'Access denied');
  }

  const bookingIdentifier = await prisma.businessMarketIdentifier.findUnique({
    where: {
      teamId_platform: {
        teamId: team.id,
        platform: 'BOOKING',
      },
    },
  });

  if (!bookingIdentifier?.identifier) {
    throw new ApiError(404, 'Booking.com identifier not found for this team');
  }

  // Fetch the business profile with all relations
  const businessProfile = await prisma.bookingBusinessProfile.findFirst({
    where: {
      teamId: team.id,
      bookingUrl: bookingIdentifier.identifier,
    },
    include: {
      overview: {
        include: {
          bookingPeriodicalMetric: {
            orderBy: {
              updatedAt: 'desc',
            },
          },
        },
      },
      businessMetadata: true,
      rooms: true,
      facilities: true,
      photos: {
        take: 5,
      },
    },
  });

  if (!businessProfile) {
    throw new ApiError(404, 'Booking.com business profile not found for this team');
  }

  // Fetch the latest 5 reviews separately for performance
  const recentReviews = await prisma.bookingReview.findMany({
    where: {
      businessProfileId: businessProfile.id,
    },
    orderBy: {
      publishedDate: 'desc',
    },
    take: 5,
  });

  return {
    ...businessProfile,
    recentReviews,
  };
}

export async function getTripAdvisorBusinessProfile(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!team || team.members.length === 0) {
    throw new ApiError(403, 'Access denied');
  }

  const profile = await prisma.tripAdvisorBusinessProfile.findUnique({
    where: {
      teamId: team.id,
    },
    include: {
      overview: true,
      businessMetadata: true,
      addressObj: true,
      subcategories: true,
      amenities: true,
      reviewTags: {
        orderBy: { reviews: 'desc' },
        take: 10,
      },
      photos: {
        take: 5,
      },
    },
  });

  return profile;
}

export async function triggerInstagramSnapshot(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!team || team.members.length === 0) {
    throw new ApiError(403, 'Access denied');
  }

  // Check if Instagram profile exists
  const instagramProfile = await prisma.instagramBusinessProfile.findUnique({
    where: {
      teamId: team.id,
    },
  });

  if (!instagramProfile) {
    throw new ApiError(404, 'Instagram business profile not found');
  }

  // TODO: Implement actual snapshot triggering logic
  // This would typically call an external service or queue a job

  recordMetric('instagram.snapshot.triggered');

  return {
    success: true,
    snapshotId: `snap_${Date.now()}`,
    snapshotDate: new Date().toISOString(),
    message: 'Instagram snapshot triggered successfully',
  };
}

export async function triggerTikTokSnapshot(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!team || team.members.length === 0) {
    throw new ApiError(403, 'Access denied');
  }

  // Check if TikTok profile exists
  const tiktokProfile = await prisma.tikTokBusinessProfile.findUnique({
    where: {
      teamId: team.id,
    },
  });

  if (!tiktokProfile) {
    throw new ApiError(404, 'TikTok business profile not found');
  }

  // TODO: Implement actual snapshot triggering logic
  // This would typically call an external service or queue a job

  recordMetric('tiktok.snapshot.triggered');

  return {
    success: true,
    snapshotId: `snap_${Date.now()}`,
    snapshotDate: new Date().toISOString(),
    message: 'TikTok snapshot triggered successfully',
  };
}

export async function getBookingOverview(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  console.log("team", team);

  if (!team || team.members.length === 0) {
    throw new ApiError(403, 'Access denied');
  }

  const bookingIdentifier = await prisma.businessMarketIdentifier.findUnique({
    where: {
      teamId_platform: {
        teamId: team.id,
        platform: "BOOKING",
      },
    },
  });

  console.log("bookingIdentifier", bookingIdentifier);

  if (!bookingIdentifier?.identifier) {
    throw new ApiError(404, 'Booking.com identifier not found for this team');
  }

  // Fetch the business profile with comprehensive overview data
  const businessProfile = await prisma.bookingBusinessProfile.findFirst({
    where: {
      teamId: team.id,
      bookingUrl: bookingIdentifier.identifier,
    },
    include: {
      overview: {
        include: {
          sentimentAnalysis: true,
          topKeywords: {
            orderBy: { count: 'desc' },
            take: 20,
          },
          recentReviews: {
            orderBy: { publishedDate: 'desc' },
            take: 10,
          },
          ratingDistribution: true,
          bookingPeriodicalMetric: {
            orderBy: { periodKey: 'asc' },
            include: {
              topKeywords: {
                orderBy: { count: 'desc' },
                take: 10,
              },
            },
          },
        },
      },
      businessMetadata: true,
      rooms: true,
      facilities: true,
      photos: {
        take: 5,
      },
    },
  });

  if (!businessProfile) {
    throw new ApiError(404, 'Booking.com business profile not found for this team');
  }

  if (!businessProfile.overview) {
    throw new ApiError(404, 'Booking.com overview data not found');
  }

  return {
    ...businessProfile,
  };
}
