import type { ApiResponse } from 'src/types';

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

import { trpc } from 'src/lib/trpc/client';
import { CACHE_TIMES } from 'src/lib/trpc/cache';

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

/**
 * Hook for Google Business Profile data using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useGoogleBusinessProfile = (slug?: string) => {
  const searchParams = useSearchParams();
  const subdomainTeamSlug = useTeamSlug();
  const rawTeamSlug = slug || subdomainTeamSlug || searchParams.get('slug');
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  const [hasAttemptedAutoSync, setHasAttemptedAutoSync] = useState(false);
  const previousTeamSlugRef = useRef<string | null>(null);

  console.log('teamSlug', teamSlug);
  
  // Use tRPC query instead of SWR
  // Enable Suspense mode to trigger loading.tsx during data fetching
  // NOTE: When using suspense, enabled must be true or Suspense won't trigger
  // The component should handle the conditional logic before calling this hook
  const { data, error, isLoading, refetch } = trpc.platforms.googleProfile.useQuery(
    { slug: teamSlug! },
    {
      // enabled: true, // Must be enabled for Suspense to work
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: CACHE_TIMES.PLATFORM_PROFILE.staleTime,
      gcTime: CACHE_TIMES.PLATFORM_PROFILE.gcTime,
      retry: 1, // Reduced for faster feedback
      suspense: true, // ← Enable Suspense mode
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
      const noDataOrError = (!data || error) && !hasAttemptedAutoSync;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamSlug, isLoading, hasAttemptedAutoSync]);

  const mutateBusinessProfile = async () => {
    if (teamSlug) {
      await refetch();
    }
  };

  return {
    isLoading,
    isError: !!error,
    businessProfile: data || null,
    mutateBusinessProfile,
    // triggerWorkflow,
  };
};

export default useGoogleBusinessProfile;
