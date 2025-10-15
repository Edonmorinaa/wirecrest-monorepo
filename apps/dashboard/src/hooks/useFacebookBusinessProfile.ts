import type {
  FacebookOverview,
  FacebookBusinessProfile,
  FacebookBusinessMetadata,
} from '@prisma/client';
import type { ApiResponse } from 'src/types';

import useSWR from 'swr';
import { useParams } from 'next/navigation';

import { getFacebookBusinessProfile } from 'src/actions/platforms';

import { useTeamSlug } from './use-subdomain';

export interface FacebookBusinessProfileWithRelations extends FacebookBusinessProfile {
  overview?: FacebookOverview | null;
  businessMetadata?: FacebookBusinessMetadata | null;
  reviews?: any[];
}

const useFacebookBusinessProfile = (slug?: string) => {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const rawTeamSlug = slug || subdomainTeamSlug || (params?.slug as string);
  const teamSlug = typeof rawTeamSlug === 'string' ? rawTeamSlug : null;

  const { data, error, isLoading, mutate } = useSWR<FacebookBusinessProfileWithRelations | null>(
    teamSlug ? `facebook-business-profile-${teamSlug}` : null,
    () => getFacebookBusinessProfile(teamSlug!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  const refreshProfile = async () => {
    await mutate();
  };

  return {
    businessProfile: data || null,
    isLoading,
    error,
    refreshProfile,
    mutate,
  };
};

export default useFacebookBusinessProfile;
