import { prisma } from '@wirecrest/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamSlug = searchParams.get('teamSlug');

  if (!teamSlug) {
    return NextResponse.json(
      { error: { message: 'Team slug is required' } },
      { status: 400 }
    );
  }

  try {
    // Get team
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug },
      include: { locations: true },
    });

    if (!team) {
      return NextResponse.json(
        { error: { message: 'Team not found' } },
        { status: 404 }
      );
    }

    if (!team.locations || team.locations.length === 0) {
      return NextResponse.json({
        businessProfile: null,
        reviews: {
          google: [],
          facebook: [],
        },
      });
    }

    // Get the first location's business profiles (or you can aggregate across all locations)
    const locationIds = team.locations.map(loc => loc.id);
    
    // Get business profile for the first location
    const businessProfile = await prisma.googleBusinessProfile.findFirst({
      where: { locationId: { in: locationIds } },
    });

    // Get reviews from different platforms across all team locations
    const googleReviews = await prisma.googleReview.findMany({
      where: {
        businessProfile: {
          locationId: { in: locationIds },
        },
      },
      orderBy: { publishedAtDate: 'desc' },
      take: 100, // Limit to prevent too much data
    });

    const facebookReviews = await prisma.facebookReview.findMany({
      where: {
        businessProfile: {
          locationId: { in: locationIds },
        },
      },
      orderBy: { date: 'desc' },
      take: 100, // Limit to prevent too much data
    });

    // Serialize the data to handle Date objects and any other non-serializable types
    const serializedData = {
      businessProfile: businessProfile ? JSON.parse(JSON.stringify(businessProfile)) : null,
      reviews: {
        google: JSON.parse(JSON.stringify(googleReviews)),
        facebook: JSON.parse(JSON.stringify(facebookReviews)),
      },
    };

    return NextResponse.json(serializedData);
  } catch (error: any) {
    console.error('Error fetching team reviews:', error);
    return NextResponse.json(
      { error: { message: `Failed to fetch reviews: ${error.message}` } },
      { status: 500 }
    );
  }
}
