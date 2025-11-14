import { TikTokBusinessProfile } from '@/types/tiktok-analytics';

import { trpc } from 'src/lib/trpc/client';
import { CACHE_TIMES } from 'src/lib/trpc/cache';

interface UseTikTokBusinessProfileReturn {
  businessProfile: TikTokBusinessProfile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for TikTok Business Profile data using tRPC
 * Replaces manual state management with React Query (via tRPC)
 */
export default function useTikTokBusinessProfile(teamSlug: string): UseTikTokBusinessProfileReturn {
  // Use tRPC query for automatic caching and state management
  const { data, error, isLoading, refetch } = trpc.platforms.tiktokProfile.useQuery(
    { slug: teamSlug },
    {
      suspense: true,
      refetchOnWindowFocus: false,
      staleTime: CACHE_TIMES.PLATFORM_PROFILE.staleTime,
      gcTime: CACHE_TIMES.PLATFORM_PROFILE.gcTime,
      retry: 3,
    }
  );

  return {
    businessProfile: (data as TikTokBusinessProfile) || null,
    isLoading,
    error: error?.message || null,
    refetch: async () => {
      await refetch();
    },
  };
}