/**
 * Tenant Features Router
 * 
 * tRPC router for tenant feature access via Stripe Entitlements:
 * - Get tenant features
 * - Check specific features
 * - Feature cache management
 */

import { TRPCError } from '@trpc/server';
import { prisma } from '@wirecrest/db';
import {
  StripeService,
  StripeFeatureLookupKey,
  getAllStripeFeatureKeys,
  getGlobalFeatureChecker,
} from '@wirecrest/billing';
import { router, protectedProcedure } from '../trpc';
import {
  tenantFeatureIdSchema,
  checkFeaturesSchema,
  checkSingleFeatureSchema,
} from '../schemas/tenant-features.schema';

// Use the global FeatureChecker instance
const featureChecker = getGlobalFeatureChecker();

/**
 * Tenant Features Router
 */
export const tenantFeaturesRouter = router({
  /**
   * Get all features a tenant has access to
   */
  getFeatures: protectedProcedure
    .input(tenantFeatureIdSchema)
    .query(async ({ input }) => {
      try {
        // Get tenant's team ID
        const team = await prisma.team.findFirst({
          where: {
            OR: [{ id: input.tenantId }, { slug: input.tenantId }],
          },
          select: { id: true, slug: true },
        });

        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found',
          });
        }

        // Get all features this team has access to
        const availableFeatures = await featureChecker.getTeamFeatures(team.id);

        // Convert Set to object format for backwards compatibility
        const featuresObject: Record<string, boolean> = {};
        const allFeatureKeys = getAllStripeFeatureKeys();

        allFeatureKeys.forEach((key) => {
          featuresObject[key] = availableFeatures.has(key);
        });

        // Get subscription info for metadata
        const subscription = await prisma.teamSubscription.findFirst({
          where: {
            teamId: team.id,
            status: {
              in: ['ACTIVE', 'TRIALING'],
            },
          },
          select: {
            status: true,
            stripeCustomerId: true,
          },
        });

        return {
          success: true,
          tenantId: team.slug,
          features: featuresObject,
          metadata: {
            hasActiveSubscription: !!subscription,
            subscriptionStatus: subscription?.status,
            source: 'stripe_entitlements',
            featureCount: availableFeatures.size,
          },
          resolvedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Error getting tenant features:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get tenant features',
        });
      }
    }),

  /**
   * Check access to specific features
   */
  checkFeatures: protectedProcedure
    .input(checkFeaturesSchema)
    .query(async ({ input }) => {
      try {
        const { tenantId, featureKeys } = input;

        if (!Array.isArray(featureKeys) || featureKeys.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid request: features array required',
          });
        }

        // Get team ID
        const team = await prisma.team.findFirst({
          where: {
            OR: [{ id: tenantId }, { slug: tenantId }],
          },
          select: { id: true, slug: true },
        });

        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found',
          });
        }

        // Check all requested features
        const results = await featureChecker.checkFeatures(
          team.id,
          featureKeys as StripeFeatureLookupKey[]
        );

        return {
          success: true,
          tenantId: team.slug,
          features: results,
          checkedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Error checking features:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check features',
        });
      }
    }),

  /**
   * Check if a tenant has access to a single feature
   */
  checkSingleFeature: protectedProcedure
    .input(checkSingleFeatureSchema)
    .query(async ({ input }) => {
      try {
        const { tenantId, featureKey } = input;

        // Get team ID
        const team = await prisma.team.findFirst({
          where: {
            OR: [{ id: tenantId }, { slug: tenantId }],
          },
          select: { id: true, stripeCustomerId: true },
        });

        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found',
          });
        }

        // Get current subscription to get product ID
        const stripeService = new StripeService();
        const { productId } = await stripeService.getCurrentSubscription(
          team.stripeCustomerId
        );

        if (!productId) {
          return {
            hasAccess: false,
            reason: 'No active subscription found',
          };
        }

        // Check feature
        const result = await featureChecker.checkFeature(
          productId,
          featureKey as StripeFeatureLookupKey
        );

        return {
          hasAccess: result.hasAccess,
          reason: result.reason,
        };
      } catch (error) {
        console.error('Error checking single feature:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check feature',
        });
      }
    }),

  /**
   * Invalidate feature cache for a tenant
   * (Call after subscription changes)
   */
  invalidateCache: protectedProcedure
    .input(tenantFeatureIdSchema)
    .mutation(async ({ input }) => {
      try {
        const team = await prisma.team.findFirst({
          where: {
            OR: [{ id: input.tenantId }, { slug: input.tenantId }],
          },
          select: { id: true },
        });

        if (!team) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found',
          });
        }

        await featureChecker.clearTeamCache(team.id);

        return { success: true };
      } catch (error) {
        console.error('Error invalidating cache:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to invalidate cache',
        });
      }
    }),
});

