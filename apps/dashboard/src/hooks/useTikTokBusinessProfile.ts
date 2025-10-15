import { useState, useEffect, useCallback } from 'react';
import { TikTokBusinessProfile } from '@/types/tiktok-analytics';
import { getTikTokBusinessProfile } from 'src/actions/platforms';

interface UseTikTokBusinessProfileReturn {
  businessProfile: TikTokBusinessProfile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export default function useTikTokBusinessProfile(teamSlug: string): UseTikTokBusinessProfileReturn {
  const [businessProfile, setBusinessProfile] = useState<TikTokBusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinessProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getTikTokBusinessProfile(teamSlug);
      setBusinessProfile(data as any);
    } catch (err) {
      console.error('Error fetching TikTok business profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch business profile');
      setBusinessProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [teamSlug]);

  useEffect(() => {
    if (teamSlug) {
      fetchBusinessProfile();
    }
  }, [teamSlug, fetchBusinessProfile]);

  return {
    businessProfile,
    isLoading,
    error,
    refetch: fetchBusinessProfile,
  };
}