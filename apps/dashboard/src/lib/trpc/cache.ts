/**
 * tRPC Cache Management Utilities
 * 
 * Centralized cache invalidation and management for platform data.
 * Ensures data consistency across the application.
 */

import { useQueryClient } from '@tanstack/react-query';

/**
 * Cache time constants for different data types
 */
export const CACHE_TIMES = {
  // Platform profile data (rarely changes)
  PLATFORM_PROFILE: {
    staleTime: 10 * 60 * 1000,  // 10 minutes
    gcTime: 30 * 60 * 1000,     // 30 minutes
  },
  
  // Platform overview/metrics (changes periodically)
  PLATFORM_OVERVIEW: {
    staleTime: 5 * 60 * 1000,   // 5 minutes
    gcTime: 15 * 60 * 1000,     // 15 minutes
  },
  
  // Reviews data (changes frequently)
  REVIEWS: {
    staleTime: 2 * 60 * 1000,   // 2 minutes
    gcTime: 10 * 60 * 1000,     // 10 minutes
  },
  
  // Team data (rarely changes)
  TEAM: {
    staleTime: 10 * 60 * 1000,  // 10 minutes
    gcTime: 30 * 60 * 1000,     // 30 minutes
  },
  
  // User/auth data (rarely changes)
  USER: {
    staleTime: 15 * 60 * 1000,  // 15 minutes
    gcTime: 60 * 60 * 1000,     // 60 minutes
  },
  
  // Billing/subscription (changes infrequently)
  BILLING: {
    staleTime: 5 * 60 * 1000,   // 5 minutes
    gcTime: 15 * 60 * 1000,     // 15 minutes
  },
} as const;

/**
 * Hook for managing tRPC cache invalidation
 * Provides utilities to invalidate specific or related queries
 */
export function useCacheInvalidation() {
  const queryClient = useQueryClient();

  return {
    /**
     * Invalidate all queries for a specific team
     */
    invalidateTeamData: (teamSlug: string) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as any[];
          return queryKey.some((key) => 
            typeof key === 'object' && key?.input?.slug === teamSlug
          );
        },
      });
    },

    /**
     * Invalidate all platform data for a team
     */
    invalidatePlatformData: (teamSlug: string) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as any[];
          return (
            queryKey[0]?.[0] === 'platforms' &&
            queryKey.some((key) => 
              typeof key === 'object' && key?.input?.slug === teamSlug
            )
          );
        },
      });
    },

    /**
     * Invalidate specific platform profile
     */
    invalidatePlatformProfile: (platform: string, teamSlug: string) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as any[];
          return (
            queryKey[0]?.[0] === 'platforms' &&
            queryKey[0]?.[1] === `${platform}Profile` &&
            queryKey.some((key) => 
              typeof key === 'object' && key?.input?.slug === teamSlug
            )
          );
        },
      });
    },

    /**
     * Invalidate all reviews for a team
     */
    invalidateReviews: (teamSlug: string) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as any[];
          return (
            (queryKey[0]?.[0] === 'reviews' || 
             queryKey[0]?.[0] === 'platforms') &&
            queryKey.some((key) => 
              typeof key === 'object' && key?.input?.slug === teamSlug
            )
          );
        },
      });
    },

    /**
     * Invalidate reviews for a specific platform
     */
    invalidatePlatformReviews: (platform: string, teamSlug: string) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as any[];
          return (
            queryKey[0]?.[0] === 'platforms' &&
            (queryKey[0]?.[1]?.includes(platform) || 
             queryKey[0]?.[1]?.includes('Reviews')) &&
            queryKey.some((key) => 
              typeof key === 'object' && key?.input?.slug === teamSlug
            )
          );
        },
      });
    },

    /**
     * Invalidate billing/subscription data for a team
     */
    invalidateBillingData: (teamSlug: string) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as any[];
          return (
            queryKey[0]?.[0] === 'billing' &&
            queryKey.some((key) => 
              typeof key === 'object' && key?.input?.slug === teamSlug
            )
          );
        },
      });
    },

    /**
     * Invalidate all data (use sparingly, e.g., after logout)
     */
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },

    /**
     * Clear all cached data (use very sparingly)
     */
    clearAll: () => {
      queryClient.clear();
    },

    /**
     * Manually refetch specific query
     */
    refetch: (queryKey: any[]) => {
      return queryClient.refetchQueries({ queryKey });
    },

    /**
     * Set query data manually (for optimistic updates)
     */
    setQueryData: (queryKey: any[], data: any) => {
      queryClient.setQueryData(queryKey, data);
    },

    /**
     * Get cached query data
     */
    getQueryData: (queryKey: any[]) => {
      return queryClient.getQueryData(queryKey);
    },
  };
}

/**
 * Cache invalidation patterns for common mutations
 */
export const CACHE_INVALIDATION_PATTERNS = {
  // After connecting a platform
  onPlatformConnect: (teamSlug: string, platform: string, invalidate: ReturnType<typeof useCacheInvalidation>) => {
    invalidate.invalidatePlatformProfile(platform, teamSlug);
    invalidate.invalidatePlatformData(teamSlug);
  },

  // After disconnecting a platform
  onPlatformDisconnect: (teamSlug: string, platform: string, invalidate: ReturnType<typeof useCacheInvalidation>) => {
    invalidate.invalidatePlatformProfile(platform, teamSlug);
    invalidate.invalidatePlatformData(teamSlug);
  },

  // After updating review metadata
  onReviewUpdate: (teamSlug: string, platform: string, invalidate: ReturnType<typeof useCacheInvalidation>) => {
    invalidate.invalidatePlatformReviews(platform, teamSlug);
    invalidate.invalidateReviews(teamSlug);
  },

  // After syncing platform data
  onPlatformSync: (teamSlug: string, platform: string, invalidate: ReturnType<typeof useCacheInvalidation>) => {
    invalidate.invalidatePlatformProfile(platform, teamSlug);
    invalidate.invalidatePlatformReviews(platform, teamSlug);
  },

  // After updating team settings
  onTeamUpdate: (teamSlug: string, invalidate: ReturnType<typeof useCacheInvalidation>) => {
    invalidate.invalidateTeamData(teamSlug);
  },

  // After subscription change
  onSubscriptionChange: (teamSlug: string, invalidate: ReturnType<typeof useCacheInvalidation>) => {
    invalidate.invalidateBillingData(teamSlug);
    invalidate.invalidateTeamData(teamSlug);
  },
} as const;

/**
 * Utility to create cache key for platform data
 */
export function getPlatformCacheKey(platform: string, operation: string, slug: string) {
  return [['platforms', `${platform}${operation}`], { input: { slug } }];
}

/**
 * Utility to create cache key for reviews
 */
export function getReviewsCacheKey(operation: string, slug: string, filters?: any) {
  return [['reviews', operation], { input: { slug, ...filters } }];
}

