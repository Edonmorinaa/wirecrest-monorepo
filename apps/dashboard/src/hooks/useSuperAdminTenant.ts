import { getTeamById, getTeamPlatformData } from '@/actions/superadmin';
import useSWR from 'swr';

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

// Helper function to transform platform data
function transformPlatformData(platformData: any): TenantDetailResponse['platforms'] {
  const { identifiers, profiles, syncStatus } = platformData;
  
  // Create a map of identifiers by platform
  const identifierMap = new Map(
    identifiers.map((id: any) => [id.platform.toLowerCase(), id.identifier])
  );

  // Helper to determine platform status
  const getPlatformStatus = (profile: any, identifier: string | null, platformKey: string): PlatformData['status'] => {
    if (!identifier) return 'not_started';
    if (!profile) return 'identifier_set';
    
    // Check if currently syncing from syncStatus
    if (syncStatus?.recentSyncs) {
      const platformSync = syncStatus.recentSyncs.find(
        (sync: any) => sync.platform.toLowerCase() === platformKey
      );
      if (platformSync) {
        if (platformSync.status === 'running' || platformSync.status === 'pending') {
          return profile._count?.reviews > 0 ? 'reviews_in_progress' : 'profile_in_progress';
        }
        if (platformSync.status === 'failed') return 'failed';
      }
    }
    
    if (profile._count?.reviews > 0 || profile._count?.dailySnapshots > 0) {
      return 'completed';
    }
    
    return 'profile_completed';
  };

  // Transform each platform
  const google = profiles.google;
  const facebook = profiles.facebook;
  const tripadvisor = profiles.tripadvisor;
  const booking = profiles.booking;
  const instagram = profiles.instagram;
  const tiktok = profiles.tiktok;

  const googleIdentifier = (identifierMap.get('google_maps') as string) || null;
  const facebookIdentifier = (identifierMap.get('facebook') as string) || null;
  const tripadvisorIdentifier = (identifierMap.get('tripadvisor') as string) || null;
  const bookingIdentifier = (identifierMap.get('booking') as string) || null;
  const instagramIdentifier = (identifierMap.get('instagram') as string) || null;
  const tiktokIdentifier = (identifierMap.get('tiktok') as string) || null;

  return {
    google: {
      identifier: googleIdentifier,
      profile: google,
      reviewsCount: google?._count?.reviews || 0,
      lastReviewDate: google?.lastReviewDate || null,
      task: null,
      status: getPlatformStatus(google, googleIdentifier, 'google_maps'),
      canCreateProfile: !!googleIdentifier && !google,
      canGetReviews: !!google,
      canRetry: false,
      statusMessage: '',
      isProcessing: false,
      currentStep: null,
    },
    facebook: {
      identifier: facebookIdentifier,
      profile: facebook,
      reviewsCount: facebook?._count?.reviews || 0,
      lastReviewDate: facebook?.lastReviewDate || null,
      task: null,
      status: getPlatformStatus(facebook, facebookIdentifier, 'facebook'),
      canCreateProfile: !!facebookIdentifier && !facebook,
      canGetReviews: !!facebook,
      canRetry: false,
      statusMessage: '',
      isProcessing: false,
      currentStep: null,
    },
    tripadvisor: {
      identifier: tripadvisorIdentifier,
      profile: tripadvisor,
      reviewsCount: tripadvisor?._count?.reviews || 0,
      lastReviewDate: tripadvisor?.lastReviewDate || null,
      task: null,
      status: getPlatformStatus(tripadvisor, tripadvisorIdentifier, 'tripadvisor'),
      canCreateProfile: !!tripadvisorIdentifier && !tripadvisor,
      canGetReviews: !!tripadvisor,
      canRetry: false,
      statusMessage: '',
      isProcessing: false,
      currentStep: null,
    },
    booking: {
      identifier: bookingIdentifier,
      profile: booking,
      reviewsCount: booking?._count?.reviews || 0,
      lastReviewDate: booking?.lastReviewDate || null,
      task: null,
      status: getPlatformStatus(booking, bookingIdentifier, 'booking'),
      canCreateProfile: !!bookingIdentifier && !booking,
      canGetReviews: !!booking,
      canRetry: false,
      statusMessage: '',
      isProcessing: false,
      currentStep: null,
    },
    instagram: {
      identifier: instagramIdentifier,
      profile: instagram,
      reviewsCount: instagram?._count?.dailySnapshots || 0,
      lastReviewDate: instagram?.updatedAt || null,
      task: null,
      status: getPlatformStatus(instagram, instagramIdentifier, 'instagram'),
      canCreateProfile: !!instagramIdentifier && !instagram,
      canGetReviews: !!instagram,
      canRetry: false,
      statusMessage: '',
      isProcessing: false,
      currentStep: null,
    },
    tiktok: {
      identifier: tiktokIdentifier,
      profile: tiktok,
      reviewsCount: tiktok?._count?.dailySnapshots || 0,
      lastReviewDate: tiktok?.updatedAt || null,
      task: null,
      status: getPlatformStatus(tiktok, tiktokIdentifier, 'tiktok'),
      canCreateProfile: !!tiktokIdentifier && !tiktok,
      canGetReviews: !!tiktok,
      canRetry: false,
      statusMessage: '',
      isProcessing: false,
      currentStep: null,
    },
  };
}

// Helper to calculate stats
function calculateStats(platformData: any): TenantDetailResponse['stats'] {
  const { profiles, syncStatus } = platformData;
  
  const totalReviews = 
    (profiles.google?._count?.reviews || 0) +
    (profiles.facebook?._count?.reviews || 0) +
    (profiles.tripadvisor?._count?.reviews || 0) +
    (profiles.booking?._count?.reviews || 0);

  const platformsWithIdentifier = [
    profiles.google,
    profiles.facebook,
    profiles.tripadvisor,
    profiles.booking,
    profiles.instagram,
    profiles.tiktok,
  ].filter(Boolean).length;

  const completionPercentage = (platformsWithIdentifier / 6) * 100;

  const activeTasksCount = syncStatus?.recentSyncs?.filter(
    (sync: any) => sync.status === 'running' || sync.status === 'pending'
  ).length || 0;

  const failedTasksCount = syncStatus?.recentSyncs?.filter(
    (sync: any) => sync.status === 'failed'
  ).length || 0;

  return {
    totalReviews,
    totalPhotos: 0,
    averageRating: 0,
    completionPercentage,
    activeTasksCount,
    failedTasksCount,
  };
}

export function useSuperAdminTenant(tenantId: string) {
  const { data, error, isLoading, mutate } = useSWR<TenantDetailResponse>(
    tenantId ? `superadmin-tenant-${tenantId}` : null,
    async () => {
      const [team, platformData] = await Promise.all([
        getTeamById(tenantId),
        getTeamPlatformData(tenantId),
      ]);
      
      return {
        tenant: team,
        platforms: transformPlatformData(platformData),
        recentActivity: [],
        stats: calculateStats(platformData),
      };
    },
    {
      refreshInterval: 10000, // Poll every 10 seconds for real-time updates
      revalidateOnFocus: true,
      dedupingInterval: 5000,
      onError: (err) => {
        console.error('Error fetching tenant data:', err);
      },
    }
  );

  const refresh = async () => {
    await mutate();
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
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch tenant') : null,
    refresh,
  };
}
