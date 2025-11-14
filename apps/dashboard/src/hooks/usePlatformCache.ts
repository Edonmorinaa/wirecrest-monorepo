/**
 * Platform Cache Management Hook
 * 
 * Provides easy-to-use cache invalidation for platform-specific data.
 * Use this in components that perform mutations on platform data.
 */

'use client';

import { useParams } from 'next/navigation';

import { useCacheInvalidation, CACHE_INVALIDATION_PATTERNS } from 'src/lib/trpc/cache';

import { useTeamSlug } from './use-subdomain';

export function usePlatformCache() {
  const params = useParams();
  const subdomainTeamSlug = useTeamSlug();
  const teamSlug = (subdomainTeamSlug || params?.slug) as string;

  const invalidate = useCacheInvalidation();

  return {
    /**
     * Invalidate all data for current team
     */
    invalidateCurrentTeam: () => {
      if (teamSlug) {
        invalidate.invalidateTeamData(teamSlug);
      }
    },

    /**
     * Invalidate all platform data for current team
     */
    invalidateAllPlatforms: () => {
      if (teamSlug) {
        invalidate.invalidatePlatformData(teamSlug);
      }
    },

    /**
     * Invalidate specific platform profile
     * @param platform - 'google', 'facebook', 'tripadvisor', 'booking', 'instagram', 'tiktok'
     */
    invalidatePlatform: (platform: string) => {
      if (teamSlug) {
        invalidate.invalidatePlatformProfile(platform, teamSlug);
      }
    },

    /**
     * Invalidate all reviews for current team
     */
    invalidateAllReviews: () => {
      if (teamSlug) {
        invalidate.invalidateReviews(teamSlug);
      }
    },

    /**
     * Invalidate reviews for a specific platform
     * @param platform - 'google', 'facebook', 'tripadvisor', 'booking'
     */
    invalidatePlatformReviews: (platform: string) => {
      if (teamSlug) {
        invalidate.invalidatePlatformReviews(platform, teamSlug);
      }
    },

    /**
     * Invalidate billing/subscription data
     */
    invalidateBilling: () => {
      if (teamSlug) {
        invalidate.invalidateBillingData(teamSlug);
      }
    },

    /**
     * Common pattern: After connecting a platform
     */
    onPlatformConnect: (platform: string) => {
      if (teamSlug) {
        CACHE_INVALIDATION_PATTERNS.onPlatformConnect(teamSlug, platform, invalidate);
      }
    },

    /**
     * Common pattern: After disconnecting a platform
     */
    onPlatformDisconnect: (platform: string) => {
      if (teamSlug) {
        CACHE_INVALIDATION_PATTERNS.onPlatformDisconnect(teamSlug, platform, invalidate);
      }
    },

    /**
     * Common pattern: After updating a review
     */
    onReviewUpdate: (platform: string) => {
      if (teamSlug) {
        CACHE_INVALIDATION_PATTERNS.onReviewUpdate(teamSlug, platform, invalidate);
      }
    },

    /**
     * Common pattern: After syncing platform data
     */
    onPlatformSync: (platform: string) => {
      if (teamSlug) {
        CACHE_INVALIDATION_PATTERNS.onPlatformSync(teamSlug, platform, invalidate);
      }
    },

    /**
     * Common pattern: After updating team settings
     */
    onTeamUpdate: () => {
      if (teamSlug) {
        CACHE_INVALIDATION_PATTERNS.onTeamUpdate(teamSlug, invalidate);
      }
    },

    /**
     * Common pattern: After subscription change
     */
    onSubscriptionChange: () => {
      if (teamSlug) {
        CACHE_INVALIDATION_PATTERNS.onSubscriptionChange(teamSlug, invalidate);
      }
    },

    // Expose low-level invalidation for advanced use cases
    ...invalidate,
    
    // Current team slug
    teamSlug,
  };
}

