import type {
  FacebookOverview,
  FacebookBusinessProfile,
  FacebookBusinessMetadata,
  FacebookRecommendationDistribution,
} from '@prisma/client';

import { useRouter } from 'next/router';

import { trpc } from 'src/lib/trpc/client';

interface FacebookProfileWithRelations extends FacebookBusinessProfile {
  overview?: FacebookOverview | null;
  recommendationDistribution?: FacebookRecommendationDistribution | null;
  businessMetadata?: FacebookBusinessMetadata | null;
  reviews?: any[];
}

/**
 * Hook for fetching Facebook profile using tRPC
 * Replaces SWR with React Query (via tRPC)
 * 
 * Note: Profile creation is DEPRECATED and moved to scraper
 */
const useFacebookProfile = (slug?: string) => {
  const { query, isReady } = useRouter();
  const rawTeamSlug = slug || (isReady ? query.slug : null);
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  const { data, error, isLoading, refetch } = trpc.platforms.facebookProfile.useQuery(
    { slug: teamSlug! },
    {
      enabled: !!teamSlug,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60000, // 1 minute
      retry: 3,
    }
  );

  // DEPRECATED: Profile creation moved to scraper
  // Use admin actions: createOrUpdateMarketIdentifier + executePlatformAction
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
    throw new Error(
      'DEPRECATED: Profile creation moved to scraper. Please use the superadmin panel to create profiles via the new flow.'
    );
  };

  const updateProfile = async (updateData: Partial<FacebookBusinessProfile>) => {
    if (!teamSlug) throw new Error('Team slug is required');

    const response = await fetch(`/api/teams/${teamSlug}/facebook-business-profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update Facebook profile');
    }

    await refetch();
    return await response.json();
  };

  const deleteProfile = async () => {
    if (!teamSlug) throw new Error('Team slug is required');

    const response = await fetch(`/api/teams/${teamSlug}/facebook-business-profile`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to delete Facebook profile');
    }

    await refetch();
    return await response.json();
  };

  return {
    profile: data as FacebookProfileWithRelations | undefined,
    isLoading,
    error: error?.message || null,
    mutate: refetch,
    refetch,
    // CRUD operations (create is deprecated)
    createProfile, // Throws error
    updateProfile, // Still uses API route
    deleteProfile, // Still uses API route
  };
};

export default useFacebookProfile;
