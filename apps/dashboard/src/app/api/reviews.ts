import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@wirecrest/db';

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
    });

    if (!team) {
      return NextResponse.json(
        { error: { message: 'Team not found' } },
        { status: 404 }
      );
    }

    // Get business profile
    const businessProfile = await prisma.googleBusinessProfile.findFirst({
      where: { teamId: team.id },
    });

    // Get reviews from different platforms
    const googleReviews = await prisma.googleReview.findMany({
      where: {
        businessProfile: {
          teamId: team.id,
        },
      },
      orderBy: { publishedAtDate: 'desc' },
    });

    const facebookReviews = await prisma.facebookReview.findMany({
      where: {
        businessProfile: {
          teamId: team.id,
        },
      },
      orderBy: { date: 'desc' },
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
