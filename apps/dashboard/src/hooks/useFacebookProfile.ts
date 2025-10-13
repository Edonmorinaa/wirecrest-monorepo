import type {
  FacebookOverview,
  FacebookBusinessProfile,
  FacebookBusinessMetadata,
  FacebookRecommendationDistribution,
} from '@prisma/client';
import type { ApiResponse } from 'src/types';

import useSWR from 'swr';
import { useRouter } from 'next/router';

import fetcher from 'src/lib/fetcher';

interface FacebookProfileWithRelations extends FacebookBusinessProfile {
  overview?: FacebookOverview | null;
  recommendationDistribution?: FacebookRecommendationDistribution | null;
  businessMetadata?: FacebookBusinessMetadata | null;
  reviews?: any[];
}

const useFacebookProfile = (slug?: string) => {
  const { query, isReady } = useRouter();
  const rawTeamSlug = slug || (isReady ? query.slug : null);
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<FacebookProfileWithRelations>>(
    teamSlug ? `/api/teams/${teamSlug}/facebook-business-profile` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  const createProfile = async (profileData?: {
    pageId?: string;
    facebookId?: string;
    title?: string;
    pageName?: string;
    likes?: number;
    followers?: number;
    categories?: string[];
    info?: string[];
    websites?: string[];
  }) => {
    if (!teamSlug) throw new Error('Team slug is required');

    const response = await fetch(`/api/teams/${teamSlug}/facebook-business-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData || {}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create Facebook profile');
    }

    const result = await response.json();
    await mutate();
    return result;
  };

  const updateProfile = async (updateData: Partial<FacebookBusinessProfile>) => {
    if (!teamSlug) throw new Error('Team slug is required');

    const response = await fetch(`/api/teams/${teamSlug}/facebook-business-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update Facebook profile');
    }

    const result = await response.json();
    await mutate();
    return result;
  };

  const deleteProfile = async () => {
    if (!teamSlug) throw new Error('Team slug is required');

    const response = await fetch(`/api/teams/${teamSlug}/facebook-business-profile`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete Facebook profile');
    }

    await mutate();
  };

  const refreshProfile = async () => {
    await mutate();
  };

  return {
    facebookProfile: data?.data || null,
    isLoading,
    isError: error,
    createProfile,
    updateProfile,
    deleteProfile,
    refreshProfile,
    mutate,
  };
};

export default useFacebookProfile;
