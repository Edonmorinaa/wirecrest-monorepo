// pages/api/teams/[slug]/google-business-profile.ts
// CORRECTED VERSION

import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getCurrentUserWithTeam } from 'models/team';
import { throwIfNotAllowed } from 'models/user';
import { MarketPlatform } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const user = await getCurrentUserWithTeam(req, res);
    throwIfNotAllowed(user, 'team', 'read');

    const googleIdentifier = await prisma.businessMarketIdentifier.findUnique({
      where: {
        teamId_platform: {
          teamId: user.team.id,
          platform: MarketPlatform.GOOGLE_MAPS,
        },
      },
    });

    console.log('googleIdentifier', googleIdentifier);
    
    if (!googleIdentifier?.identifier) {
      return res.status(404).json({
        error: { message: 'Google Maps identifier not found for this team' },
      });
    }

    // CORRECTED: Simplified query with only verified relationships
    const businessProfile = await prisma.googleBusinessProfile.findFirst({
      where: {
        teamId: user.team.id,
        placeId: googleIdentifier.identifier,
      },
      include: {
        // Core analytics data
        overview: {
          include: {
            periodicalMetrics: {
              orderBy: {
                updatedAt: 'desc'
              }
            }
          }
        },
        
        // Business metadata
        metadata: true,
        
        // Only include relationships that actually exist in your Prisma schema
        // Remove these until you verify they exist:
        // - location
        // - reviewsDistribution  
        // - categories
        // - imageCategories
        // - popularTimesHistogram
        // - reviewsTags
        // - additionalInfo
        // - questionsAndAnswers
        // - openingHours (all variants)
        
        // You can add them back one by one after verifying the relationship names
      },
    });

    console.log('businessProfile', businessProfile);

    if (!businessProfile) {
      console.log('businessProfile', businessProfile);
      return res.status(404).json({
        error: { message: 'Google business profile not found for this team' },
      });
    }

    // Fetch the latest 5 reviews separately for performance
    const recentReviews = await prisma.googleReview.findMany({
      where: {
        businessProfileId: businessProfile.id,
      },
      orderBy: {
        publishedAtDate: 'desc'
      },
      take: 5
    });

    // Add recent reviews to the response
    const profileWithReviews = {
      ...businessProfile,
      recentReviews: recentReviews
    };

    res.status(200).json({ data: profileWithReviews });
  } catch (error: any) {
    console.error('Error fetching Google business profile:', error);
    res.status(500).json({
      error: { 
        message: 'Failed to fetch Google business profile',
        details: error.message
      }
    });
  }
} 