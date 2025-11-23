import type {
  InstagramDailySnapshot,
  InstagramMediaSnapshot,
  InstagramBusinessProfile,
  InstagramCommentSnapshot,
  InstagramSnapshotSchedule,
  InstagramWeeklyAggregation,
  InstagramMonthlyAggregation,
} from '@prisma/client';
import type { ApiResponse } from 'src/types';

import { useParams } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';

import { trpc } from 'src/lib/trpc/client';
import { CACHE_TIMES } from 'src/lib/trpc/cache';

import { useTeamSlug } from './use-subdomain';

// Instagram Business Profile with relations using Prisma types
export interface InstagramBusinessProfileWithRelations extends InstagramBusinessProfile {
  dailySnapshots?: InstagramDailySnapshot[];
  mediaSnapshots?: InstagramMediaSnapshot[];
  commentSnapshots?: InstagramCommentSnapshot[];
  weeklyAggregations?: InstagramWeeklyAggregation[];
  monthlyAggregations?: InstagramMonthlyAggregation[];
  snapshotSchedule?: InstagramSnapshotSchedule | null;
}

/**
 * Hook for Instagram Business Profile data using tRPC
 * Replaces SWR with React Query (via tRPC)
 */
const useInstagramBusinessProfile = (slug?: string, locationSlug?: string) => {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const rawTeamSlug = slug || subdomainTeamSlug || (params?.slug as string);
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;
  
  // Get location slug from params if not provided
  const rawLocationSlug = locationSlug || (params?.locationSlug as string);
  const resolvedLocationSlug = typeof rawLocationSlug === 'string' ? rawLocationSlug : null;

  const [hasAttemptedAutoSync, setHasAttemptedAutoSync] = useState(false);
  const previousTeamSlugRef = useRef<string | null>(null);

  console.log('Instagram hook - teamSlug:', teamSlug);
  console.log('Instagram hook - locationSlug:', resolvedLocationSlug);
  console.log('Instagram hook - params:', params);
  
  // Use tRPC query instead of SWR
  const { data, error, isLoading, refetch } = trpc.platforms.instagramProfile.useQuery(
    { slug: teamSlug!, locationSlug: resolvedLocationSlug! },
    {
      enabled: !!teamSlug && !!resolvedLocationSlug,
      suspense: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: CACHE_TIMES.PLATFORM_PROFILE.staleTime,
      gcTime: CACHE_TIMES.PLATFORM_PROFILE.gcTime,
      retry: 3,
      retryDelay: 5000,
    }
  );

  // Use tRPC mutation for taking snapshot
  const triggerSnapshotMutation = trpc.platforms.triggerInstagramSnapshot.useMutation({
    onSuccess: () => {
      refetch(); // Refresh data after snapshot
    },
  });

  console.log('Instagram hook - data:', data);
  console.log('Instagram hook - error:', error);
  console.log('Instagram hook - isLoading:', isLoading);

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
      console.log('Auto-syncing Instagram business profile for team:', teamSlug);

      // Reset auto-sync flag when team changes
      if (previousTeamSlugRef.current !== teamSlug) {
        setHasAttemptedAutoSync(false);
      }

      // Note: Auto-sync disabled for now - manual trigger required
      // triggerWorkflow()
      //   .then(() => {
      //     setHasAttemptedAutoSync(true);
      //   })
      //   .catch((error) => {
      //     console.error('Auto-sync failed:', error);
      //     setHasAttemptedAutoSync(true);
      //   });
    }

    // Update the previous team slug reference
    previousTeamSlugRef.current = teamSlug;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamSlug, isLoading, hasAttemptedAutoSync]);

  const mutateBusinessProfile = async () => {
    if (teamSlug && resolvedLocationSlug) {
      await refetch();
    }
  };

  const takeSnapshot = async () => {
    if (!teamSlug || !resolvedLocationSlug) return null;

    try {
      return await triggerSnapshotMutation.mutateAsync({ slug: teamSlug, locationSlug: resolvedLocationSlug });
    } catch (error) {
      console.error('Error taking Instagram snapshot:', error);
      throw error;
    }
  };

  return {
    isLoading,
    isError: !!error,
    businessProfile: data || null,
    mutateBusinessProfile,
    takeSnapshot,
    isSnapshotLoading: triggerSnapshotMutation.isPending,
  };
};

export default useInstagramBusinessProfile;
