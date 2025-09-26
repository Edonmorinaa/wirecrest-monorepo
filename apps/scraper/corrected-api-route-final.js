// pages/api/teams/[slug]/google-business-profile.ts
// FINAL CORRECTED VERSION - TESTED AND WORKING

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
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

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the Google identifier for this team
    const { data: googleIdentifier, error: identifierError } = await supabase
      .from('BusinessMarketIdentifier')
      .select('*')
      .eq('teamId', user.team.id)
      .eq('platform', 'GOOGLE_MAPS')
      .single();

    if (identifierError || !googleIdentifier?.identifier) {
      return res.status(404).json({
        error: { message: 'Google Maps identifier not found for this team' },
      });
    }

    // CORRECTED: Use table names, not Prisma relationship aliases
    const { data: businessProfile, error: businessError } = await supabase
      .from('GoogleBusinessProfile')
      .select(`
        *,
        GoogleOverview(
          *,
          PeriodicalMetric(*)
        ),
        GoogleBusinessMetadata(*)
      `)
      .eq('teamId', user.team.id)
      .eq('placeId', googleIdentifier.identifier)
      .single();

    if (businessError) {
      console.error('Error fetching business profile:', businessError);
      return res.status(500).json({
        error: { message: 'Failed to fetch business profile' }
      });
    }

    if (!businessProfile) {
      return res.status(404).json({
        error: { message: 'Google business profile not found for this team' },
      });
    }

    // Fetch recent reviews separately for performance
    const { data: recentReviews, error: reviewsError } = await supabase
      .from('GoogleReview')
      .select('*')
      .eq('businessProfileId', businessProfile.id)
      .order('publishedAtDate', { ascending: false })
      .limit(5);

    if (reviewsError) {
      console.error('Error fetching recent reviews:', reviewsError);
    }

    // Transform the data to match frontend expectations
    const transformedProfile = {
      ...businessProfile,
      // Transform GoogleOverview array to single object for frontend compatibility
      overview: businessProfile.GoogleOverview?.[0] ? {
        ...businessProfile.GoogleOverview[0],
        // Transform PeriodicalMetric array to periodicalMetrics for frontend compatibility
        periodicalMetrics: businessProfile.GoogleOverview[0].PeriodicalMetric || []
      } : null,
      // Transform GoogleBusinessMetadata array to single object
      metadata: businessProfile.GoogleBusinessMetadata?.[0] || null,
      // Add recent reviews
      recentReviews: recentReviews || [],
      // Remove the raw Supabase arrays to avoid confusion
      GoogleOverview: undefined,
      GoogleBusinessMetadata: undefined
    };

    res.status(200).json({ data: transformedProfile });
  } catch (error: any) {
    console.error('Error in Google business profile API:', error);
    res.status(500).json({
      error: { 
        message: 'Failed to fetch Google business profile',
        details: error.message
      }
    });
  }
} 