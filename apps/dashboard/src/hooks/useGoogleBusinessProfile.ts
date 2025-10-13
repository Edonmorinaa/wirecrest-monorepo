import type { ApiResponse } from 'src/types';

import useSWR, { mutate } from 'swr';
import { useSearchParams } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import {
  Day,
  Hour,
  Answer,
  Period,
  Location,
  Category,
  ReviewsTag,
  SpecialHour,
  GoogleReview,
  OpeningHours,
  ImageCategory,
  GoogleOverview,
  AdditionalInfo,
  ReviewMetadata,
  PeriodicalMetric,
  AdditionalInfoItem,
  ReviewsDistribution,
  QuestionsAndAnswers,
  GoogleBusinessProfile,
  PopularTimesHistogram,
  GoogleBusinessMetadata,
} from '@prisma/client';

import fetcher from 'src/lib/fetcher';

import { useTeamSlug } from './use-subdomain';

// Opening Hours with relations interface
export interface OpeningHoursWithRelations extends OpeningHours {
  periods?: Period[];
  specialHours?: SpecialHour[];
}

// Complete interface matching Prisma schema
export interface GoogleBusinessProfileWithRelations extends GoogleBusinessProfile {
  // Core relations
  location?: Location | null;
  overview?: GoogleOverviewWithRelations | null;
  reviewsDistribution?: ReviewsDistribution | null;
  categories?: Category[];
  imageCategories?: ImageCategory[];
  popularTimesHistogram?: PopularTimesHistogramWithRelations | null;
  reviewsTags?: ReviewsTag[];
  additionalInfo?: AdditionalInfoWithRelations | null;
  questionsAndAnswers?: QuestionsAndAnswersWithRelations | null;
  metadata?: GoogleBusinessMetadata | null;

  // Opening hours relations
  openingHours?: OpeningHoursWithRelations | null;
  currentOpeningHours?: OpeningHoursWithRelations | null;
  regularOpeningHours?: OpeningHoursWithRelations | null;

  // Recent reviews (latest 5) - matches API response
  reviews?: GoogleReviewWithRelations[];
}

export interface GoogleOverviewWithRelations extends GoogleOverview {
  periodicalMetrics?: PeriodicalMetric[];
}

export interface GoogleReviewWithRelations extends GoogleReview {
  reviewMetadata?: ReviewMetadata;
}

export interface PopularTimesHistogramWithRelations extends PopularTimesHistogram {
  days?: DayWithRelations[];
}

export interface DayWithRelations extends Day {
  hours?: Hour[];
}

export interface AdditionalInfoWithRelations extends AdditionalInfo {
  items?: AdditionalInfoItem[];
}

export interface QuestionsAndAnswersWithRelations extends QuestionsAndAnswers {
  answers?: Answer[];
}

const useGoogleBusinessProfile = (slug?: string) => {
  const searchParams = useSearchParams();
  const subdomainTeamSlug = useTeamSlug();
  const rawTeamSlug = slug || subdomainTeamSlug || searchParams.get('slug');
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  const [hasAttemptedAutoSync, setHasAttemptedAutoSync] = useState(false);
  const previousTeamSlugRef = useRef<string | null>(null);

  console.log('teamSlug', teamSlug);
  const { data, error, isLoading } = useSWR<ApiResponse<GoogleBusinessProfileWithRelations>>(
    teamSlug ? `/api/teams/${teamSlug}/google-business-profile` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  // Trigger workflow by calling backend endpoint
  // const triggerWorkflow = async () => {
  //   if (!teamSlug) return null;

  //   try {
  //     const response = await fetch('/api/trigger-workflow', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         teamSlug,
  //         platform: MarketPlatform.GOOGLE_MAPS
  //       }),
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.error?.message || 'Failed to trigger workflow');
  //     }

  //     const result = await response.json();
  //     return result;
  //   } catch (error) {
  //     console.error('Error triggering workflow:', error);
  //     throw error;
  //   }
  // };

  // Auto-sync logic when team changes or when data is missing
  useEffect(() => {
    const shouldAutoSync = () => {
      // Don't auto-sync if we're still loading
      if (isLoading) return false;

      // Don't auto-sync if no team slug
      if (!teamSlug) return false;

      // Check if team changed
      const teamChanged = previousTeamSlugRef.current !== teamSlug;

      // Check if we have no data or error (and haven't attempted auto-sync for this team yet)
      const noDataOrError = (!data?.data || error) && !hasAttemptedAutoSync;

      return teamChanged || noDataOrError;
    };

    if (shouldAutoSync()) {
      console.log('Auto-syncing Google business profile for team:', teamSlug);

      // Reset auto-sync flag when team changes
      if (previousTeamSlugRef.current !== teamSlug) {
        setHasAttemptedAutoSync(false);
      }

      // Trigger auto-sync
      // triggerWorkflow()
      //   .then(() => {
      //     setHasAttemptedAutoSync(true);
      //   })
      //   .catch((error) => {
      //     console.error('Auto-sync failed:', error);
      //     setHasAttemptedAutoSync(true); // Still mark as attempted to prevent infinite retries
      //   });
    }

    // Update the previous team slug reference
    previousTeamSlugRef.current = teamSlug;
  }, [teamSlug, data?.data, error, isLoading, hasAttemptedAutoSync]);

  const mutateBusinessProfile = async () => {
    if (teamSlug) {
      await mutate(`/api/teams/${teamSlug}/google-business-profile`);
    }
  };

  return {
    isLoading,
    isError: error,
    businessProfile: data?.data,
    mutateBusinessProfile,
    // triggerWorkflow,
  };
};

export default useGoogleBusinessProfile;
