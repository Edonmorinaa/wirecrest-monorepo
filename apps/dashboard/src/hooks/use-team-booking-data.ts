'use client';

import { useState, useEffect, useCallback } from 'react';

import { getBookingOverview } from 'src/actions/platforms';

import { useTeamSlug } from './use-subdomain';

interface UseTeamBookingDataReturn {
  businessProfile: any;
  overview: any;
  sentimentAnalysis: any;
  topKeywords: any[];
  recentReviews: any[];
  ratingDistribution: any;
  periodicalMetrics: any[];
  isLoading: boolean;
  isError: any;
  refreshData: () => Promise<void>;
}

export function useTeamBookingData(slug?: string): UseTeamBookingDataReturn {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState<any>(null);
  const subdomainTeamSlug = useTeamSlug();

  // Use slug from props, subdomain, or fallback to null
  const teamSlug = slug || subdomainTeamSlug;

  const fetchData = useCallback(async () => {
    if (!teamSlug) return;
    
    try {
      setIsLoading(true);
      setIsError(null);
      
      const result = await getBookingOverview(teamSlug);
      setData(result);
    } catch (error) {
      console.error('Error fetching team booking data:', error);
      setIsError(error);
    } finally {
      setIsLoading(false);
    }
  }, [teamSlug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshData = async () => {
    await fetchData();
  };

  // Extract data with proper fallbacks
  const businessProfile = data || null;
  const overview = businessProfile?.overview || null;
  const sentimentAnalysis = overview?.sentimentAnalysis || null;
  const topKeywords = overview?.topKeywords || [];
  const recentReviews = businessProfile?.recentReviews || [];
  const ratingDistribution = overview?.ratingDistribution || null;
  const periodicalMetrics = overview?.bookingPeriodicalMetric || [];

  return {
    businessProfile,
    overview,
    sentimentAnalysis,
    topKeywords,
    recentReviews,
    ratingDistribution,
    periodicalMetrics,
    isLoading,
    isError,
    refreshData,
  };
}
