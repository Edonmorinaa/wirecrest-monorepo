import { useState, useEffect, useCallback } from 'react';
import { TikTokBusinessProfile } from '@/types/tiktok-analytics';

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

      const response = await fetch(`/api/teams/${teamSlug}/tiktok-business-profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setBusinessProfile(null);
          return;
        }
        throw new Error(`Failed to fetch TikTok business profile: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.data) {
        setBusinessProfile(result.data);
      } else {
        setBusinessProfile(null);
      }
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