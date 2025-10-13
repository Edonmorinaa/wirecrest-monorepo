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

import useSWR, { mutate } from 'swr';
import { useParams } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';

import fetcher from 'src/lib/fetcher';

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

const useInstagramBusinessProfile = (slug?: string) => {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const rawTeamSlug = slug || subdomainTeamSlug || (params?.slug as string);
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  const [hasAttemptedAutoSync, setHasAttemptedAutoSync] = useState(false);
  const previousTeamSlugRef = useRef<string | null>(null);

  console.log('Instagram hook - teamSlug:', teamSlug);
  console.log('Instagram hook - params:', params);
  
  const { data, error, isLoading } = useSWR<ApiResponse<InstagramBusinessProfileWithRelations>>(
    teamSlug ? `/api/teams/${teamSlug}/instagram-business-profile` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  console.log('Instagram hook - data:', data);
  console.log('Instagram hook - error:', error);
  console.log('Instagram hook - isLoading:', isLoading);

  // Trigger workflow by calling backend endpoint
  const triggerWorkflow = async () => {
    if (!teamSlug) return null;

    try {
      const response = await fetch('/api/trigger-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamSlug,
          platform: 'INSTAGRAM',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to trigger workflow');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error triggering Instagram workflow:', error);
      throw error;
    }
  };

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
  }, [teamSlug, data?.data, error, isLoading, hasAttemptedAutoSync]);

  const mutateBusinessProfile = async () => {
    if (teamSlug) {
      await mutate(`/api/teams/${teamSlug}/instagram-business-profile`);
    }
  };

  const takeSnapshot = async () => {
    if (!teamSlug) return null;

    try {
      const response = await fetch(`/api/teams/${teamSlug}/instagram/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to take snapshot');
      }

      const result = await response.json();
      // Refresh data after taking snapshot
      await mutateBusinessProfile();
      return result;
    } catch (error) {
      console.error('Error taking Instagram snapshot:', error);
      throw error;
    }
  };

  return {
    isLoading,
    isError: error,
    businessProfile: data?.data,
    mutateBusinessProfile,
    triggerWorkflow,
    takeSnapshot,
  };
};

export default useInstagramBusinessProfile;
