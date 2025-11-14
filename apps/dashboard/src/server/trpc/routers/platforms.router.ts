/**
 * Platforms Router
 * 
 * tRPC router for platform integration management with feature access control:
 * - Business market identifiers
 * - Google, Facebook, Instagram, TikTok, Booking, TripAdvisor profiles
 * - Platform reviews and snapshots
 * 
 * All procedures require authentication, team access, and feature access validation.
 * Returns specific error codes:
 * - UNAUTHORIZED: Not logged in
 * - FORBIDDEN: Not a team member
 * - PAYMENT_REQUIRED: No active subscription
 * - PRECONDITION_FAILED: Feature not in plan
 * - NOT_FOUND: Platform not set up
 */

import { TRPCError } from '@trpc/server';

import { router, protectedProcedure, requireFeature } from '../trpc';
import {
  platformSlugSchema,
  createMarketIdentifierSchema,
  createGoogleProfileSchema,
  getGoogleReviewsSchema,
  createFacebookProfileSchema,
  getFacebookReviewsSchema,
} from '../schemas/platforms.schema';
import { getFacebookReviews as _getFacebookReviews } from 'src/actions/facebook-reviews';
import {
  createBusinessMarketIdentifierAction as _createBusinessMarketIdentifierAction,
  getBusinessMarketIdentifiers as _getBusinessMarketIdentifiers,
  getGoogleBusinessProfile as _getGoogleBusinessProfile,
  createGoogleProfile as _createGoogleProfile,
  getFacebookBusinessProfile as _getFacebookBusinessProfile,
  createFacebookProfile as _createFacebookProfile,
  getInstagramBusinessProfile as _getInstagramBusinessProfile,
  getTikTokBusinessProfile as _getTikTokBusinessProfile,
  getPlatformStatus as _getPlatformStatus,
  getBookingBusinessProfile as _getBookingBusinessProfile,
  getTripAdvisorBusinessProfile as _getTripAdvisorBusinessProfile,
  triggerInstagramSnapshot as _triggerInstagramSnapshot,
  triggerTikTokSnapshot as _triggerTikTokSnapshot,
  getBookingOverview as _getBookingOverview,
} from 'src/actions/platforms';
import {
  getGoogleReviews as _getGoogleReviews,
  getTripAdvisorReviews as _getTripAdvisorReviews,
  getBookingReviews as _getBookingReviews,
} from 'src/actions/reviews';

/**
 * Platforms Router
 */
export const platformsRouter = router({
  /**
   * Get business market identifiers for a team
   */
  marketIdentifiers: protectedProcedure
    .input(platformSlugSchema)
    .query(async ({ input }) => {
      try {
        const result = await _getBusinessMarketIdentifiers(input.slug);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get market identifiers',
        });
      }
    }),

  /**
   * Create business market identifier
   */
  createMarketIdentifier: protectedProcedure
    .input(createMarketIdentifierSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await _createBusinessMarketIdentifierAction(
          input.teamSlug,
          {
            platform: input.platform,
            identifier: input.identifier,
          }
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create market identifier',
        });
      }
    }),

  /**
   * Get Google business profile
   * Requires: google_overview feature
   */
  googleProfile: protectedProcedure
    .input(platformSlugSchema)
    .use(requireFeature('google_overview'))
    .query(async ({ input }) => {
      try {
        const result = await _getGoogleBusinessProfile(input.slug);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get Google profile',
        });
      }
    }),

  /**
   * Create Google profile
   * Requires: google_overview feature
   */
  createGoogleProfile: protectedProcedure
    .input(createGoogleProfileSchema)
    .use(requireFeature('google_overview'))
    .mutation(async ({ input }) => {
      try {
        const result = await _createGoogleProfile(input.teamSlug, {
          placeId: input.placeId,
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create Google profile',
        });
      }
    }),

  /**
   * Get Google reviews from database
   * Requires: google_reviews feature
   */
  googleReviews: protectedProcedure
    .input(getGoogleReviewsSchema)
    .use(requireFeature('google_reviews'))
    .query(async ({ input }) => {
      try {
        const result = await _getGoogleReviews(input.teamSlug, input.filters || {});
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get Google reviews',
        });
      }
    }),

  /**
   * Get Facebook business profile
   * Requires: facebook_overview feature
   */
  facebookProfile: protectedProcedure
    .input(platformSlugSchema)
    .use(requireFeature('facebook_overview'))
    .query(async ({ input }) => {
      try {
        const result = await _getFacebookBusinessProfile(input.slug);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get Facebook profile',
        });
      }
    }),

  /**
   * Get Facebook overview
   * Requires: facebook_overview feature
   */
  facebookOverview: protectedProcedure
    .input(platformSlugSchema)
    .use(requireFeature('facebook_overview'))
    .query(async ({ input }) => {
      try {
        const result = await _getFacebookBusinessProfile(input.slug);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get Facebook overview',
        });
      }
    }),

  /**
   * Create Facebook profile
   * Requires: facebook_overview feature
   */
  createFacebookProfile: protectedProcedure
    .input(createFacebookProfileSchema)
    .use(requireFeature('facebook_overview'))
    .mutation(async ({ input }) => {
      try {
        const result = await _createFacebookProfile(input.teamSlug, {
          facebookUrl: input.facebookUrl,
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create Facebook profile',
        });
      }
    }),

  /**
   * Get Facebook reviews from database
   * Requires: facebook_reviews feature
   */
  facebookReviews: protectedProcedure
    .input(getFacebookReviewsSchema)
    .use(requireFeature('facebook_reviews'))
    .query(async ({ input }) => {
      try {
        const result = await _getFacebookReviews(input.teamSlug, input.filters || {});
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get Facebook reviews',
        });
      }
    }),

  /**
   * Get Instagram business profile
   * Requires: instagram_overview feature
   */
  instagramProfile: protectedProcedure
    .input(platformSlugSchema)
    .use(requireFeature('instagram_overview'))
    .query(async ({ input }) => {
      try {
        const result = await _getInstagramBusinessProfile(input.slug);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get Instagram profile',
        });
      }
    }),

  /**
   * Get TikTok business profile
   * Requires: tiktok_overview feature
   */
  tiktokProfile: protectedProcedure
    .input(platformSlugSchema)
    .use(requireFeature('tiktok_overview'))
    .query(async ({ input }) => {
      try {
        const result = await _getTikTokBusinessProfile(input.slug);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get TikTok profile',
        });
      }
    }),

  /**
   * Get platform status for a team
   * No feature requirement - shows connection status
   */
  getPlatformStatus: protectedProcedure
    .input(platformSlugSchema)
    .query(async ({ input }) => {
      try {
        const result = await _getPlatformStatus(input.slug);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get platform status',
        });
      }
    }),

  /**
   * Get Booking business profile
   * Requires: booking_overview feature
   */
  bookingProfile: protectedProcedure
    .input(platformSlugSchema)
    .use(requireFeature('booking_overview'))
    .query(async ({ input }) => {
      try {
        const result = await _getBookingBusinessProfile(input.slug);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get Booking profile',
        });
      }
    }),

  /**
   * Get Booking overview
   * Requires: booking_overview feature
   */
  bookingOverview: protectedProcedure
    .input(platformSlugSchema)
    .use(requireFeature('booking_overview'))
    .query(async ({ input }) => {
      try {
        const result = await _getBookingOverview(input.slug);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get Booking overview',
        });
      }
    }),

  /**
   * Get TripAdvisor business profile
   * Requires: tripadvisor_overview feature (if exists)
   */
  tripadvisorProfile: protectedProcedure
    .input(platformSlugSchema)
    .query(async ({ input }) => {
      try {
        const result = await _getTripAdvisorBusinessProfile(input.slug);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get TripAdvisor profile',
        });
      }
    }),

  /**
   * Trigger Instagram snapshot
   * Requires: instagram_analytics feature
   */
  triggerInstagramSnapshot: protectedProcedure
    .input(platformSlugSchema)
    .use(requireFeature('instagram_analytics'))
    .mutation(async ({ input }) => {
      try {
        const result = await _triggerInstagramSnapshot(input.slug);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to trigger Instagram snapshot',
        });
      }
    }),

  /**
   * Trigger TikTok snapshot
   * Requires: tiktok_analytics feature
   */
  triggerTikTokSnapshot: protectedProcedure
    .input(platformSlugSchema)
    .use(requireFeature('tiktok_analytics'))
    .mutation(async ({ input }) => {
      try {
        const result = await _triggerTikTokSnapshot(input.slug);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to trigger TikTok snapshot',
        });
      }
    }),

  /**
   * Get TripAdvisor reviews from database
   * Requires: tripadvisor_reviews feature
   */
  tripadvisorReviews: protectedProcedure
    .input(getGoogleReviewsSchema) // Reuse the same schema structure
    .use(requireFeature('tripadvisor_reviews'))
    .query(async ({ input }) => {
      try {
        const result = await _getTripAdvisorReviews(input.teamSlug, input.filters || {});
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get TripAdvisor reviews',
        });
      }
    }),

  /**
   * Get Booking reviews from database
   * Requires: booking_reviews feature
   */
  bookingReviews: protectedProcedure
    .input(getGoogleReviewsSchema) // Reuse the same schema structure
    .use(requireFeature('booking_reviews'))
    .query(async ({ input }) => {
      try {
        const result = await _getBookingReviews(input.teamSlug, input.filters || {});
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get Booking reviews',
        });
      }
    }),
});
