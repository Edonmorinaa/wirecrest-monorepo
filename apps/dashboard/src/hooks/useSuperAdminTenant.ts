import { getTeamById } from '@/actions/superadmin';
import { useState, useEffect, useCallback } from 'react';

interface PlatformData {
  identifier: string | null;
  profile: any | null;
  reviewsCount: number;
  lastReviewDate: Date | null;
  task: any | null;
  status: 'not_started' | 'identifier_set' | 'profile_in_progress' | 'profile_completed' | 'reviews_in_progress' | 'completed' | 'failed';
  canCreateProfile: boolean;
  canGetReviews: boolean;
  canRetry: boolean;
  statusMessage: string;
  isProcessing: boolean;
  currentStep: string | null;
}

interface TenantDetailResponse {
  tenant: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
    members: Array<{
      id: string;
      role: string;
      user: {
        id: string;
        name: string;
        email: string;
      };
    }>;
  };
  
  platforms: {
    google: PlatformData;
    facebook: PlatformData;
    tripadvisor: PlatformData;
    booking: PlatformData;
    instagram: PlatformData;
    tiktok: PlatformData;
  };
  
  recentActivity: Array<{
    id: string;
    type: 'task_created' | 'task_completed' | 'task_failed' | 'status_message';
    platform: string;
    message: string;
    timestamp: Date;
    metadata?: any;
  }>;
  
  stats: {
    totalReviews: number;
    totalPhotos: number;
    averageRating: number;
    completionPercentage: number;
    activeTasksCount: number;
    failedTasksCount: number;
  };
}

export function useSuperAdminTenant(tenantId: string) {
  const [data, setData] = useState<TenantDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantData = useCallback(async () => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const teamData = await getTeamById(tenantId);
      // Transform team data to match the expected interface
      const tenantData = {
        tenant: teamData,
        platforms: {
          google: { identifier: null, profile: null, reviewsCount: 0, lastReviewDate: null, task: null, status: 'not_started' as const, canCreateProfile: false, canGetReviews: false, canRetry: false, statusMessage: '', isProcessing: false, currentStep: null },
          facebook: { identifier: null, profile: null, reviewsCount: 0, lastReviewDate: null, task: null, status: 'not_started' as const, canCreateProfile: false, canGetReviews: false, canRetry: false, statusMessage: '', isProcessing: false, currentStep: null },
          tripadvisor: { identifier: null, profile: null, reviewsCount: 0, lastReviewDate: null, task: null, status: 'not_started' as const, canCreateProfile: false, canGetReviews: false, canRetry: false, statusMessage: '', isProcessing: false, currentStep: null },
          booking: { identifier: null, profile: null, reviewsCount: 0, lastReviewDate: null, task: null, status: 'not_started' as const, canCreateProfile: false, canGetReviews: false, canRetry: false, statusMessage: '', isProcessing: false, currentStep: null },
          instagram: { identifier: null, profile: null, reviewsCount: 0, lastReviewDate: null, task: null, status: 'not_started' as const, canCreateProfile: false, canGetReviews: false, canRetry: false, statusMessage: '', isProcessing: false, currentStep: null },
          tiktok: { identifier: null, profile: null, reviewsCount: 0, lastReviewDate: null, task: null, status: 'not_started' as const, canCreateProfile: false, canGetReviews: false, canRetry: false, statusMessage: '', isProcessing: false, currentStep: null },
        },
        marketIdentifiers: [], // Add market identifiers if needed
        recentActivity: [], // Add recent activity if needed
        stats: {
          totalReviews: 0,
          totalPhotos: 0,
          averageRating: 0,
          completionPercentage: 0,
          activeTasksCount: 0,
          failedTasksCount: 0,
        },
      };
      setData(tenantData);
    } catch (err) {
      console.error('Error fetching tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tenant');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenantData();
  }, [tenantId, fetchTenantData]);

  const refresh = async () => {
    await fetchTenantData();
  };

  // Computed properties for backward compatibility
  const tenant = data?.tenant || null;
  const platforms = data?.platforms || null;
  const recentActivity = data?.recentActivity || [];
  const stats = data?.stats || {
    totalReviews: 0,
    totalPhotos: 0,
    averageRating: 0,
    completionPercentage: 0,
    activeTasksCount: 0,
    failedTasksCount: 0,
  };

  return {
    data,
    tenant,
    platforms,
    recentActivity,
    stats,
    isLoading,
    error,
    refresh,
  };
}
