'use server';


import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth-next';
import { MarketPlatform } from '@prisma/client';
import {
  createBusinessMarketIdentifier,
} from '@/models/business-market-identifier';

import { throwIfNotSuperAdmin } from 'src/lib/permissions';
import { validateWithSchema, createBusinessMarketIndetifiersSchema } from 'src/lib/zod';

import { ApiError, recordMetric } from './lib';

// Business Market Identifiers Actions
export async function getBusinessMarketIdentifiers(teamSlug: string, locationId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
    include: {
      locations: {
        include: {
          marketIdentifiers: true,
        },
      },
    },
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

  // If locationId is specified, return only that location's identifiers
  if (locationId) {
    const location = team.locations.find((loc) => loc.id === locationId);
    if (!location) {
      throw new ApiError(404, 'Location not found');
    }
    recordMetric('business-market-identifier.fetched');
    return location.marketIdentifiers;
  }

  // Otherwise, return all identifiers from all locations
  const allIdentifiers = team.locations.flatMap((loc) => loc.marketIdentifiers);

  recordMetric('business-market-identifier.fetched');

  return allIdentifiers;
}

export async function createBusinessMarketIdentifierAction(
  teamSlug: string,
  data: { platform: MarketPlatform; identifier: string; locationId: string }
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

  const { platform, identifier, locationId } = validateWithSchema(createBusinessMarketIndetifiersSchema, data);

  if (!Object.values(MarketPlatform).includes(platform as MarketPlatform)) {
    throw new ApiError(400, 'Invalid platform');
  }

  // Verify location belongs to team
  const location = await prisma.businessLocation.findFirst({
    where: {
      id: locationId,
      teamId: team.id,
    },
  });

  if (!location) {
    throw new ApiError(404, 'Location not found or does not belong to this team');
  }

  // Create a new business market identifier
  const marketIdentifier = await createBusinessMarketIdentifier(
    {
      identifier,
      platform: platform as MarketPlatform,
    },
    locationId,
    platform as MarketPlatform
  );

  return marketIdentifier;
}

// Google Business Profile Actions
export async function getGoogleBusinessProfile(teamSlug: string, locationId?: string) {
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

  const whereClause = locationId
    ? { locationId }
    : { businessLocation: { teamId: team.id } };

  const profile = await prisma.googleBusinessProfile.findFirst({
    where: whereClause,
    include: {
      businessLocation: true,
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
// Use admin.createOrUpdateMarketIdentifierEnhanced + admin.executePlatformAction instead
export async function createGoogleProfile(
  teamSlug: string,
  data: { placeId: string; locationId: string }
) {
  await throwIfNotSuperAdmin();

  const { placeId, locationId } = data;

  if (!placeId) {
    throw new ApiError(400, 'Place ID is required');
  }

  if (!locationId) {
    throw new ApiError(400, 'Location ID is required');
  }

  // Get team by slug
  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  console.log('⚠️ DEPRECATED: createGoogleProfile called. Use admin actions instead.');
  console.log('Creating Google profile for team:', team.id, 'location:', locationId, 'with placeId:', placeId);

  // Import admin actions
  const { createOrUpdateMarketIdentifierEnhanced, executePlatformAction } = await import('./admin');

  // Step 1: Create/update market identifier
  await createOrUpdateMarketIdentifierEnhanced({
    locationId,
    platform: 'GOOGLE_MAPS',
    identifier: placeId,
  });

  // Step 2: Execute platform action (delegates to scraper)
  const result = await executePlatformAction({
    teamId: team.id,
    locationId,
    platform: 'GOOGLE_MAPS',
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
    where: {
      businessLocation: { teamId: team.id },
      placeId
    },
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
export async function getFacebookBusinessProfile(teamSlug: string, locationId?: string) {
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

  const whereClause = locationId
    ? { locationId }
    : { businessLocation: { teamId: team.id } };

  const profile = await prisma.facebookBusinessProfile.findFirst({
    where: whereClause,
    include: {
      businessLocation: true,
      businessMetadata: true,
      reviews: {
        orderBy: { date: 'desc' },
        take: 10,
      },
    },
  });

  return profile;
}

// DEPRECATED: Profile creation moved to scraper
// Use admin.createOrUpdateMarketIdentifierEnhanced + admin.executePlatformAction instead
export async function createFacebookProfile(
  teamSlug: string,
  data: { facebookUrl: string; locationId: string }
) {
  await throwIfNotSuperAdmin();

  const { facebookUrl, locationId } = data;

  if (!facebookUrl) {
    throw new ApiError(400, 'Facebook URL is required');
  }

  if (!locationId) {
    throw new ApiError(400, 'Location ID is required');
  }

  // Get team by slug
  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  console.log('⚠️ DEPRECATED: createFacebookProfile called. Use admin actions instead.');
  console.log('Creating Facebook profile for team:', team.id, 'location:', locationId, 'with URL:', facebookUrl);

  // Import admin actions
  const { createOrUpdateMarketIdentifierEnhanced, executePlatformAction } = await import('./admin');

  // Step 1: Create/update market identifier
  await createOrUpdateMarketIdentifierEnhanced({
    locationId,
    platform: 'FACEBOOK',
    identifier: facebookUrl,
  });

  // Step 2: Execute platform action (delegates to scraper)
  const result = await executePlatformAction({
    teamId: team.id,
    locationId,
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
export async function getInstagramBusinessProfile(teamSlug: string, locationSlug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, 'Unauthorized');
  }

  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
    include: {
      locations: {
        where: { slug: locationSlug },
      },
    },
  });

  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  const location = team.locations[0];
  if (!location) {
    throw new ApiError(404, 'Location not found');
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

  const profile = await prisma.instagramBusinessProfile.findUnique({
    where: { locationId: location.id },
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

  // Get platform profiles from locations
  const [googleProfile, facebookProfile, instagramProfile] = await Promise.all([
    prisma.googleBusinessProfile.findFirst({
      where: { businessLocation: { teamId: team.id } },
      include: { reviews: { take: 1 } },
    }),
    prisma.facebookBusinessProfile.findFirst({
      where: { businessLocation: { teamId: team.id } },
      include: { reviews: { take: 1 } },
    }),
    prisma.instagramBusinessProfile.findFirst({
      where: { businessLocation: { teamId: team.id } },
      include: { dailySnapshots: { take: 1 } },
    }),
  ]);

  return {
    google: {
      connected: !!googleProfile,
      profile: googleProfile,
      hasReviews: !!googleProfile?.reviews?.length,
    },
    facebook: {
      connected: !!facebookProfile,
      profile: facebookProfile,
      hasReviews: !!facebookProfile?.reviews?.length,
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

  // Get Booking identifier from any location (use first one if multiple)
  const bookingIdentifier = await prisma.businessMarketIdentifier.findFirst({
    where: {
      location: { teamId: team.id },
      platform: 'BOOKING',
    },
  });

  if (!bookingIdentifier?.identifier) {
    throw new ApiError(404, 'Booking.com identifier not found for this team');
  }

  // Fetch the business profile with all relations
  const businessProfile = await prisma.bookingBusinessProfile.findFirst({
    where: {
      businessLocation: { teamId: team.id },
      bookingUrl: bookingIdentifier.identifier,
    },
    include: {
      businessLocation: true,
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

  // Get TripAdvisor profile from any location (use first one if multiple)
  const profile = await prisma.tripAdvisorBusinessProfile.findFirst({
    where: {
      businessLocation: { teamId: team.id },
    },
    include: {
      businessLocation: true,
      businessMetadata: true,
      addressObj: true,
      subcategories: true,
      amenities: true,
      ratingHistogram: true,
      photos: {
        take: 5,
      },
      reviews: {
        orderBy: { publishedDate: 'desc' },
        take: 10,
      },
    },
  });

  return profile;
}

export async function triggerInstagramSnapshot(slug: string, locationSlug: string) {
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
      locations: {
        where: { slug: locationSlug },
      },
    },
  });

  if (!team || team.members.length === 0) {
    throw new ApiError(403, 'Access denied');
  }

  const location = team.locations[0];
  if (!location) {
    throw new ApiError(404, 'Location not found');
  }

  // Get Instagram market identifier
  const marketIdentifier = await prisma.businessMarketIdentifier.findFirst({
    where: {
      locationId: location.id,
      platform: 'INSTAGRAM',
    },
  });

  if (!marketIdentifier?.identifier) {
    throw new ApiError(400, 'Instagram username not configured for this location');
  }

  // Call scraper service to trigger snapshot
  const backendApiUrl = process.env.BACKEND_URL || 'http://localhost:3000';

  const response = await fetch(`${backendApiUrl}/api/instagram/snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locationId: location.id,
      instagramUsername: marketIdentifier.identifier,
      includeMedia: true,
      includeComments: true,
      maxMedia: 20,
      maxComments: 50,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new ApiError(response.status, errorData.error || 'Failed to trigger Instagram snapshot');
  }

  const result = await response.json();
  recordMetric('instagram.snapshot.triggered');

  return {
    success: true,
    snapshotId: result.snapshotId,
    snapshotDate: new Date().toISOString(),
    message: 'Instagram snapshot triggered successfully',
  };
}

export async function getInstagramAnalytics(
  slug: string,
  locationSlug: string,
  startDate?: string,
  endDate?: string
) {
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
      locations: {
        where: { slug: locationSlug },
      },
    },
  });

  if (!team || team.members.length === 0) {
    throw new ApiError(403, 'Access denied');
  }

  const location = team.locations[0];
  if (!location) {
    throw new ApiError(404, 'Location not found');
  }

  // Check if Instagram profile exists
  const instagramProfile = await prisma.instagramBusinessProfile.findUnique({
    where: {
      locationId: location.id,
    },
  });

  if (!instagramProfile) {
    throw new ApiError(404, 'Instagram business profile not found');
  }

  // Calculate date range (default to last 30 days)
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Import and use analytics service
  const { InstagramAnalyticsServiceV2 } = await import('@/services/instagram-analytics-service-v2');
  const analyticsService = new InstagramAnalyticsServiceV2();

  const result = await analyticsService.getAnalyticsData(
    instagramProfile.id,
    start,
    end
  );

  return result;
}

export async function enableInstagramSchedule(
  slug: string,
  locationSlug: string,
  snapshotTime: string = '09:00:00',
  timezone: string = 'UTC'
) {
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
      locations: {
        where: { slug: locationSlug },
      },
    },
  });

  if (!team || team.members.length === 0) {
    throw new ApiError(403, 'Access denied');
  }

  const location = team.locations[0];
  if (!location) {
    throw new ApiError(404, 'Location not found');
  }

  // Check if Instagram profile exists
  const instagramProfile = await prisma.instagramBusinessProfile.findUnique({
    where: {
      locationId: location.id,
    },
  });

  if (!instagramProfile) {
    throw new ApiError(404, 'Instagram business profile not found');
  }

  // Update or create snapshot schedule
  const schedule = await prisma.instagramSnapshotSchedule.upsert({
    where: {
      businessProfileId: instagramProfile.id,
    },
    update: {
      isEnabled: true,
      snapshotTime,
      timezone,
      updatedAt: new Date(),
    },
    create: {
      businessProfileId: instagramProfile.id,
      isEnabled: true,
      snapshotTime,
      timezone,
      maxRetries: 3,
      retryDelayMinutes: 5,
      consecutiveFailures: 0,
    },
  });

  recordMetric('instagram.schedule.enabled');

  return {
    success: true,
    scheduleId: schedule.id,
    message: 'Instagram snapshot schedule enabled',
  };
}

export async function disableInstagramSchedule(
  slug: string,
  locationSlug: string
) {
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
      locations: {
        where: { slug: locationSlug },
      },
    },
  });

  if (!team || team.members.length === 0) {
    throw new ApiError(403, 'Access denied');
  }

  const location = team.locations[0];
  if (!location) {
    throw new ApiError(404, 'Location not found');
  }

  // Check if Instagram profile exists
  const instagramProfile = await prisma.instagramBusinessProfile.findUnique({
    where: {
      locationId: location.id,
    },
  });

  if (!instagramProfile) {
    throw new ApiError(404, 'Instagram business profile not found');
  }

  // Update snapshot schedule
  const schedule = await prisma.instagramSnapshotSchedule.updateMany({
    where: {
      businessProfileId: instagramProfile.id,
    },
    data: {
      isEnabled: false,
      updatedAt: new Date(),
    },
  });

  recordMetric('instagram.schedule.disabled');

  return {
    success: true,
    message: 'Instagram snapshot schedule disabled',
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

  // Get TikTok market identifier
  const marketIdentifier = await prisma.businessMarketIdentifier.findFirst({
    where: {
      location: { teamId: team.id },
      platform: 'TIKTOK',
    },
  });

  if (!marketIdentifier?.identifier) {
    throw new ApiError(400, 'TikTok username not configured for this team');
  }

  // Call scraper service to trigger snapshot
  const backendApiUrl = process.env.BACKEND_URL || 'http://localhost:3000';

  const response = await fetch(`${backendApiUrl}/api/tiktok/snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamId: team.id,
      tiktokUsername: marketIdentifier.identifier,
      includeVideos: true,
      includeComments: true,
      maxVideos: 10,
      maxComments: 50,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new ApiError(response.status, errorData.error || 'Failed to trigger TikTok snapshot');
  }

  const result = await response.json();
  recordMetric('tiktok.snapshot.triggered');

  return {
    success: true,
    snapshotId: result.snapshotId,
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

  // Get Booking identifier from any location (use first one if multiple)
  const bookingIdentifier = await prisma.businessMarketIdentifier.findFirst({
    where: {
      location: { teamId: team.id },
      platform: 'BOOKING',
    },
  });

  console.log("bookingIdentifier", bookingIdentifier);

  if (!bookingIdentifier?.identifier) {
    throw new ApiError(404, 'Booking.com identifier not found for this team');
  }

  // Fetch the business profile with comprehensive data
  const businessProfile = await prisma.bookingBusinessProfile.findFirst({
    where: {
      businessLocation: { teamId: team.id },
      bookingUrl: bookingIdentifier.identifier,
    },
    include: {
      businessLocation: true,
      businessMetadata: true,
      rooms: true,
      facilities: true,
      photos: {
        take: 5,
      },
      reviews: {
        orderBy: { publishedDate: 'desc' },
        take: 10,
      },
    },
  });

  if (!businessProfile) {
    throw new ApiError(404, 'Booking.com business profile not found for this team');
  }

  return {
    ...businessProfile,
  };
}
